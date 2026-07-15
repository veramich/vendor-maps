// Auth helpers for integration tests. These create REAL better-auth users and
// sessions in the test-branch database and forge the signed session cookie the
// same way better-auth does, so server actions exercise their real
// requireAdmin() guard (auth.api.getSession) rather than a stub.

import { auth } from "@/lib/auth";
import { makeSignature } from "better-auth/crypto";
import sql from "./db.ts";

type CreatedUser = { id: string; email: string };

// Insert a user directly. better-auth reads the `user`/`session` tables we
// already loaded from db/schema, so a plain insert is enough — we don't need
// the sign-up flow (which would send emails). `id` lets a caller line the user
// up with process.env.ADMIN_USER_ID.
export async function createUser(opts: {
  id?: string;
  email?: string;
  name?: string;
}): Promise<CreatedUser> {
  const id = opts.id ?? `user_${Math.random().toString(36).slice(2, 12)}`;
  const email = opts.email ?? `${id}@example.test`;
  // Idempotent: auth tables are fixtures shared across test files (not
  // truncated between tests), so a fixed-id user like the admin may already
  // exist from an earlier file's `before`. ON CONFLICT keeps re-seeding safe.
  await sql`
    INSERT INTO "user" (id, name, email, email_verified)
    VALUES (${id}, ${opts.name ?? "Test User"}, ${email}, true)
    ON CONFLICT (id) DO NOTHING
  `;
  return { id, email };
}

// Create a real session row via better-auth's internal adapter, then build the
// signed cookie header string getSession expects: "<name>=<token>.<hmac>".
export async function sessionCookieHeader(userId: string): Promise<string> {
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(userId);
  const token = session.token;
  const signed = `${token}.${await makeSignature(token, ctx.secret)}`;
  const name = ctx.authCookies.sessionToken.name; // "better-auth.session_token"
  return `${name}=${signed}`;
}

// Convenience: seed the admin user (matching ADMIN_USER_ID) and return its
// signed cookie header, ready to hand to mockHeaders().
export async function adminCookieHeader(): Promise<string> {
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId) throw new Error("ADMIN_USER_ID must be set for admin tests");
  await createUser({ id: adminId, email: "admin@example.test", name: "Admin" });
  return sessionCookieHeader(adminId);
}
