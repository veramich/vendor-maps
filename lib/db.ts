import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: true,
  max: 10,              // maximum connections in pool
  idle_timeout: 20,     // close idle connections after 20s
  connect_timeout: 10,  // fail if connection takes over 10s
});

export default sql;