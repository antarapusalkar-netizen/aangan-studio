// Run: npm run setup:db   (creates the calls table in Neon; safe to run twice)
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL is missing. Put it in .env.local first."); process.exit(1); }
  const db = neon(url);
  const statements = readFileSync("db/schema.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean);
  for (const s of statements) await db.query(s);
  const cols = await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'calls'");
  console.log(`Done: calls table is ready (${cols[0].n} columns).`);
}
main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
