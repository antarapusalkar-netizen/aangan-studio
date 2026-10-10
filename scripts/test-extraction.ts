// Run: npm run test:extraction
// Sends each scripted transcript to OpenAI, applies the rules, and compares with the expected outcome.
// Uses the real OpenAI API (costs a fraction of a rupee).
import { extractFacts } from "../lib/extract";
import { decide } from "../lib/qualification";
import { calls } from "../tests/scripted-calls";

async function main() {
  let failed = 0, tokens = 0;
  for (const c of calls) {
    const { facts, tokens: t } = await extractFacts(c.transcript);
    tokens += t;
    const r = decide(facts);
    const sameFlags = JSON.stringify([...r.flags].sort()) === JSON.stringify([...c.expect.flags].sort());
    const ok = r.status === c.expect.status && sameFlags;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.id} expected ${c.expect.status}[${c.expect.flags}] got ${r.status}[${r.flags}]${ok ? "" : "  " + r.reason}`);
    if (!ok) console.log("      facts:", JSON.stringify(facts));
  }
  console.log(`\n${calls.length - failed}/${calls.length} match. Tokens used: ${tokens}`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
