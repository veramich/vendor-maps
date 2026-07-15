#!/usr/bin/env node
// Provisions a disposable Neon branch, loads the schema into it, runs the
// integration test suite against it, then deletes the branch — even on failure.
//
// Why a branch: our schema needs PostGIS/pg_trgm/pgcrypto, so an embedded
// Postgres (pglite/pg-mem) won't do. Neon branches are copy-on-write and match
// production exactly. We branch off `production` (which has 0 tables) and load
// db/schema/*.sql fresh, so the test DB always mirrors committed schema.
//
// Usage:  npm run test:db
//
// Requires: neonctl authenticated (`neonctl auth`), psql on PATH.

import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_DIR = path.join(ROOT, "db", "schema");

// Neon coordinates — the project/org/parent are stable for this repo.
const ORG_ID = "org-dark-mode-23405569";
const PROJECT_ID = "broad-bonus-07016490";
const PARENT_BRANCH = "production"; // empty (0 tables); we load schema ourselves
const BRANCH_NAME = `test-${Date.now()}`;

// psql isn't on PATH in this environment; Postgres.app ships it here.
const PSQL = process.env.PSQL_BIN ||
  "/Applications/Postgres.app/Contents/Versions/latest/bin/psql";

// 018_better_auth_tables.sql is a verbatim duplicate of 008 (re-added by
// accident). Applying both to a fresh DB fails with "relation user already
// exists"; in production they were incremental so only one took effect. Skip it
// on a clean load. This is the only such collision in db/schema.
const SKIP_FILES = new Set(["018_better_auth_tables.sql"]);

const neon = (args) =>
  execFileSync("neonctl", [...args, "--org-id", ORG_ID, "--project-id", PROJECT_ID], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

function createBranch() {
  console.log(`→ creating branch ${BRANCH_NAME} off ${PARENT_BRANCH}…`);
  const out = neon([
    "branches", "create",
    "--name", BRANCH_NAME,
    "--parent", PARENT_BRANCH,
    "--output", "json",
  ]);
  const parsed = JSON.parse(out);
  const branchId = parsed.branch?.id ?? parsed.id;
  if (!branchId) throw new Error("could not determine new branch id from neonctl output");
  return branchId;
}

function connectionString(branchId) {
  // Direct (non-pooled) connection for DDL + tests. sslmode=require avoids the
  // verify-full root-cert requirement documented for this project.
  const raw = neon([
    "connection-string", branchId,
    "--database-name", "neondb",
    "--pooled", "false",
    "--output", "json",
  ]).trim();
  // neonctl may print the URI bare or as JSON depending on version.
  let uri = raw;
  try { uri = JSON.parse(raw).connection_string ?? JSON.parse(raw).uri ?? raw; } catch { /* bare string */ }
  const base = uri.split("?")[0];
  return `${base}?sslmode=require`;
}

function loadSchema(dbUrl) {
  const files = readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith(".sql") && !SKIP_FILES.has(f))
    .sort();
  console.log(`→ loading ${files.length} schema files…`);
  for (const f of files) {
    const r = spawnSync(
      PSQL,
      [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", path.join(SCHEMA_DIR, f)],
      { stdio: ["ignore", "ignore", "inherit"] }
    );
    if (r.status !== 0) throw new Error(`schema load failed at ${f}`);
  }
}

function runTests(dbUrl) {
  console.log("→ running integration tests…");
  // Test env: server actions and better-auth read these at import/runtime.
  // BETTER_AUTH_SECRET only needs to be stable within this run (it signs and
  // validates the session cookie in the same process). RESEND_API_KEY is a
  // dummy so lib/email's eager `new Resend()` doesn't throw — no email is sent.
  const testEnv = {
    ...process.env,
    DATABASE_URL: dbUrl,
    TEST_DB: "1",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ||
      "integration-test-secret-at-least-32-chars-long",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    RESEND_API_KEY: process.env.RESEND_API_KEY || "re_test_dummy",
    ADMIN_USER_ID: process.env.ADMIN_USER_ID || "admin-test-user",
  };
  const r = spawnSync(
    "node",
    [
      "--import", "tsx",
      "--import", "./tests/register-paths.mjs",
      "--experimental-test-module-mocks",
      // Run each test file in its own process so DB connections, module mocks,
      // and the better-auth pool can't leak across files.
      "--test-isolation=process",
      // Serially — all files share one Neon branch DB, so parallel files would
      // delete each other's rows via resetDb(). One branch, one file at a time.
      "--test-concurrency=1",
      "--test", "tests/integration/**/*.test.ts",
    ],
    { cwd: ROOT, stdio: "inherit", env: testEnv }
  );
  return r.status ?? 1;
}

function deleteBranch(branchId) {
  if (!branchId) return;
  console.log(`→ deleting branch ${branchId}…`);
  try {
    neon(["branches", "delete", branchId]);
  } catch (e) {
    console.error(`! failed to delete branch ${branchId} — delete it manually:`);
    console.error(`  neonctl branches delete ${branchId} --org-id ${ORG_ID} --project-id ${PROJECT_ID}`);
  }
}

let branchId;
let exitCode = 1;
try {
  branchId = createBranch();
  const dbUrl = connectionString(branchId);
  loadSchema(dbUrl);
  exitCode = runTests(dbUrl);
} catch (e) {
  console.error(`✗ ${e.message}`);
  exitCode = 1;
} finally {
  deleteBranch(branchId);
}
process.exit(exitCode);
