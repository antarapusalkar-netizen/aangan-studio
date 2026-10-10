// Emails the designer a summary of the call, using Resend. Template follows docs/aangan_project_context.md section 7.
import type { Facts } from "./qualification";

export type HandoffInput = {
  status: string;
  reason: string;
  flags: string[];
  callerName: string | null;
  callerPhone: string | null;
  facts: Facts | null;
  summary: string | null;
  consultation: string | null;
};

const label: Record<string, string> = {
  decision_maker_unclear: "Decision-maker not confirmed",
  timeline_flexible_later_start: "Wanted it sooner; a later start works",
  priority_recovery: "Earlier enquiry was never followed up (priority)",
  senior_callback: "Existing client: needs a senior person's callback",
};

export function buildHandoff(h: HandoffInput) {
  const f = h.facts;
  const row = (k: string, v: string | null | undefined) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${v ?? "Not given"}</td></tr>`;
  const price = f ? (f.asked_for_price ? "Yes (deflected, no price given)" : "No") : null;
  const budget = f ? (f.budget === "not_mentioned" ? "Not mentioned" : f.budget === "clearly_insufficient" ? "Volunteered; flagged as clearly insufficient" : "Volunteered") : null;
  const subject = h.status === "escalate"
    ? `ESCALATION: existing client ${h.callerName ?? ""} needs a callback`
    : `New enquiry: ${h.callerName ?? "caller"}, ${f?.location === "pune_pcmc" ? "Pune/PCMC" : "see note"}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="margin:0 0 8px">${subject}</h2>
<p style="margin:0 0 12px"><b>${h.status.replace("_", " ")}</b>: ${h.reason}</p>
${h.flags.length ? `<p style="background:#fff4d6;padding:8px"><b>Flags:</b> ${h.flags.map((x) => label[x] ?? x).join("; ")}</p>` : ""}
<table>
${row("Name", h.callerName)}${row("Phone", h.callerPhone)}
${row("Project", f ? `${f.property_type}, ${f.work.replace(/_/g, " ")}` : null)}
${row("Location", f?.location === "pune_pcmc" ? "Pune / PCMC" : f?.location)}
${row("Carpet area", f?.carpet_area_sqft ? `${f.carpet_area_sqft} sq ft` : null)}
${row("Timeline", f?.timeline?.replace(/_/g, " "))}
${row("Decision-maker", f?.decision_maker)}
${row("Price asked", price)}${row("Budget", budget)}
${row("Consultation", h.consultation ?? "Not booked on the call")}
</table>
${h.summary ? `<p><b>Call summary</b><br>${h.summary}</p>` : ""}
</div>`;
  return { subject, html };
}

export async function sendHandoff(h: HandoffInput): Promise<void> {
  const key = process.env.RESEND_API_KEY, to = process.env.DESIGNER_EMAIL, from = process.env.RESEND_FROM;
  if (!key || !to || !from) throw new Error("RESEND_API_KEY, DESIGNER_EMAIL or RESEND_FROM is not set");
  const { subject, html } = buildHandoff(h);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
