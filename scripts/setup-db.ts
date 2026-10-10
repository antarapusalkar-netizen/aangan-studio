// Run: npm run setup:db   (creates the calls table in Neon; safe to run twice)
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is missing. Put it in .env.local first."); process.exit(1); }
const db = neon(url);
const statements = readFileSync("db/schema.sql", "utf8").split(";").map((s) => s.trim()).filter(Boolean);
for (const s of statements) await db.query(s);
console.log("Done: calls table is ready.");
