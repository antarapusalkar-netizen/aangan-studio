// Database connection. Server-side only: never import this file from a page component that runs in the browser.
import { neon } from "@neondatabase/serverless";

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local");
  return neon(url);
}
