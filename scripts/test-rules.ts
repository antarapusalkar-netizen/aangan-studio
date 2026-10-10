// Run: npm run test:rules
// Checks the qualification rules against the 20 scripted calls, plus a few edge cases. No internet or API keys needed.
import { decide } from "../lib/qualification";
import { agentQuotedPrice, PRICING_REPLY } from "../lib/pricing-rule";
import { calls } from "../tests/scripted-calls";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

for (const c of calls) {
  const r = decide(c.facts);
  const sameFlags = JSON.stringify([...r.flags].sort()) === JSON.stringify([...c.expect.flags].sort());
  check(`${c.id} ${c.note}`, r.status === c.expect.status && sameFlags, `-> ${r.status} [${r.flags.join(", ")}]`);

  // The agent's lines in each scripted call must never quote a price.
  const agentLines = c.transcript.split("\n").filter((l) => l.startsWith("AGENT:") && !l.includes(PRICING_REPLY));
  check(`${c.id} agent never quotes a price`, !agentQuotedPrice(agentLines));
}

// Edge cases from the brief.
const base = calls[0].facts;
check("unclear timeline asks one question", decide({ ...base, timeline: "unclear" }).status === "needs_clarification");
check("unclear decision-maker does NOT block", decide({ ...base, decision_maker: "unclear" }).status === "qualified");
check("no budget mentioned is qualified", decide({ ...base, budget: "not_mentioned" }).status === "qualified");
check("asking for price does NOT decline", decide({ ...base, asked_for_price: true }).status === "qualified");
check("single-room project is fine", decide({ ...base, carpet_area_sqft: 150 }).status === "qualified");
check("price detector catches a quote", agentQuotedPrice(["It will cost around 12 lakh."]));
check("price detector catches per sq ft", agentQuotedPrice(["Rates start at Rs 1800 per sq ft."]));

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
