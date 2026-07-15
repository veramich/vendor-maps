// Shared DB handle for integration tests. Connects to the Neon test branch
// whose URL is injected by scripts/test-db.mjs via DATABASE_URL. Refuses to run
// unless TEST_DB=1 is set, so a stray `node --test` can never point these at a
// real database.

import postgres from "postgres";

if (process.env.TEST_DB !== "1") {
  throw new Error(
    "Integration tests must be run via `npm run test:db` (TEST_DB=1 not set). " +
      "Running them directly could target a real database."
  );
}

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 4,
  prepare: false,
});

export default sql;

// Auth/identity tables are treated as fixtures (seeded once in `before`), not
// per-test data. Truncating them between tests races better-auth's separate
// connection pool (a session insert can outrun the visibility of the user row).
// So resetDb wipes only app-data tables and leaves these intact.
const FIXTURE_TABLES = new Set([
  "user",
  "session",
  "account",
  "verification",
  "spatial_ref_sys", // PostGIS metadata, not ours
]);

// Wipe app data between tests so each starts from a known state regardless of
// order. Auth fixtures (see FIXTURE_TABLES) are preserved.
//
// Uses DELETE, not TRUNCATE: TRUNCATE takes an AccessExclusiveLock and, via the
// FK cascade to the auth tables, deadlocks against better-auth's separate
// connection pool (which holds FK read locks on `user`). DELETE takes ordinary
// row locks and doesn't. One statement in FK-dependency order inside a single
// transaction keeps it correct and fast enough for tests.
export async function resetDb() {
  const rows = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const targets = new Set(
    rows.map((r) => r.tablename).filter((t) => !FIXTURE_TABLES.has(t))
  );
  if (targets.size === 0) return;

  // Delete children before parents so plain DELETEs don't trip FK constraints.
  // (Neon's role can't SET session_replication_role, so we order instead.)
  // Build "table -> tables it references" among our targets, then topo-sort.
  const fks = await sql<{ child: string; parent: string }[]>`
    SELECT c.relname AS child, p.relname AS parent
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_class p ON p.oid = con.confrelid
    WHERE con.contype = 'f' AND c.relname <> p.relname
  `;
  const deps = new Map<string, Set<string>>();
  for (const t of targets) deps.set(t, new Set());
  for (const { child, parent } of fks) {
    if (targets.has(child) && targets.has(parent)) deps.get(child)!.add(parent);
  }
  const order: string[] = [];
  const done = new Set<string>();
  while (order.length < targets.size) {
    const before = order.length;
    for (const t of targets) {
      if (done.has(t)) continue;
      if ([...deps.get(t)!].every((p) => done.has(p))) {
        order.push(t); // this table's parents already queued -> safe next
        done.add(t);
      }
    }
    if (order.length === before) {
      // Cycle (or self-ref not filtered) — fall back to remaining in any order.
      for (const t of targets) if (!done.has(t)) order.push(t);
      break;
    }
  }
  // order lists parents-before-children; delete children first, so reverse.
  await sql.begin(async (tx) => {
    for (const t of order.reverse()) {
      await tx.unsafe(`DELETE FROM "${t}"`);
    }
  });
}

export async function closeDb() {
  await sql.end({ timeout: 5 });
}
