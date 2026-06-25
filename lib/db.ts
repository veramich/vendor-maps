import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: true,
  max: 10,              // maximum connections in pool
  idle_timeout: 20,     // close idle connections after 20s
  connect_timeout: 10,  // fail if connection takes over 10s
  prepare: false,
});

export default sql;

// Shape of a PostgreSQL driver error. Useful for inspecting `code` (SQLSTATE,
// e.g. "23505" unique-violation) and related diagnostics in catch blocks.
export interface PgError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  column?: string;
  table?: string;
  constraint?: string;
}

/** True when `e` looks like a PostgreSQL driver error (has a SQLSTATE code). */
export function isPgError(e: unknown): e is PgError {
  return e instanceof Error && "code" in e;
}