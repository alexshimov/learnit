import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Pick up a local env file so `pnpm db:push` works after `vercel env pull`,
// without having to prefix the command with DATABASE_URL every time.
// Later files win; an inline DATABASE_URL=… still overrides all of them.
if (!process.env.DATABASE_URL) {
  for (const f of [".env", ".env.local", ".env.production.local"]) {
    if (existsSync(f)) process.loadEnvFile(f);
  }
}

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set — drizzle-kit needs the database you want to change.\n" +
      "Local dev needs none of this: the app runs embedded Postgres and applies the schema itself.\n" +
      "To update the production (Neon) database, either:\n" +
      '  DATABASE_URL="postgres://…" pnpm db:push\n' +
      "or save it once and re-run:\n" +
      "  vercel env pull .env.production.local && pnpm db:push",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
