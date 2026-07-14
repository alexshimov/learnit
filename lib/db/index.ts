import * as schema from "./schema";

type DB = import("drizzle-orm/neon-http").NeonHttpDatabase<typeof schema>;

let cached: Promise<DB> | null = null;

async function create(): Promise<DB> {
  // DATABASE_URL is what we set; POSTGRES_URL is what Vercel's Neon integration adds.
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (url) {
    // Production (and anyone who sets DATABASE_URL): Neon serverless Postgres.
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema });
  }

  // No connection string. PGlite (below) is for local dev only — it writes to
  // disk, which fails on a read-only serverless host. Fail clearly instead.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. Connect a Postgres database — in Vercel, add Neon from the project's Storage tab (it sets DATABASE_URL automatically).",
    );
  }

  // Local dev: embedded Postgres (PGlite) — no server to install, data persists
  // in ./.local-pg, schema applied automatically from ./drizzle migrations.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(".local-pg");
  const local = drizzle(client, { schema });
  await migrate(local, { migrationsFolder: "drizzle" });
  return local as unknown as DB;
}

/** Lazily create (once) and return the database. Initialization is deferred to
 *  the first query so that importing this module does no I/O — important so the
 *  production build never tries to open a database while collecting page data. */
export function getDb(): Promise<DB> {
  if (!cached) cached = create();
  return cached;
}

export { schema };
