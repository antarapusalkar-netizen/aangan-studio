"use client";
// The dashboard screen. All numbers arrive as props from the server (lib/stats.ts); nothing is invented here.
import { useState } from "react";

type Call = {
  id: number; receivedAt: string; name: string | null; phoneLast4: string | null; status: string | null;
  reason: string; flags: string[]; afterHours: boolean; consultationAt: string | null; handoff: string;
};
type Totals = {
  total: number; after_hours: number; qualified: number; declined: number; needs_clarification: number; escalate: number;
  handoff_sent: number; handoff_failed: number; priority_recovery: number; booked: number; deals: number; price_asked: number;
  with_duration: number; total_seconds: number | null; with_cost: number; total_cost_credits: number | null; openai_tokens: number | null;
};

const RESULT: Record<string, { label: string; color: string }> = {
  qualified: { label: "Qualified", color: "var(--blue-ink)" },
  declined: { label: "Declined", color: "var(--brown)" },
  needs_clarification: { label: "Needs clarification", color: "var(--tan)" },
  escalate: { label: "Escalated", color: "var(--blue-2)" },
};
const FLAG: Record<string, string> = {
  decision_maker_unclear: "Decision maker unclear",
  timeline_flexible_later_start: "Timeline flexible later start",
  priority_recovery: "Priority recovery",
  senior_callback: "Senior callback",
};
const HANDOFF: Record<string, string> = { sent: "Sent", failed: "Failed", not_needed: "Not needed" };

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmtSlot = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function DashboardView({ t, calls, updated }: { t: Totals; calls: Call[]; updated: string }) {
  const [openId, setOpenId] = useState<number | null>(null);

  const failed = calls.filter((c) => c.handoff === "failed");
  const attention = [
    t.handoff_failed > 0 && {
      key: "failed", n: t.handoff_failed, title: "Handoff failed", alarm: true,
      sub: t.handoff_failed === 1 && failed[0]?.name ? `${failed[0].name} · no designer has this call` : `${t.handoff_failed} calls not delivered`,
      target: failed[0]?.id ?? null,
    },
    t.escalate > 0 && {
      key: "escalate", n: t.escalate, title: "Escalated to a senior", alarm: false,
      sub: "Existing clients, unresolved problem", target: calls.find((c) => c.status === "escalate")?.id ?? null,
    },
    t.priority_recovery > 0 && {
      key: "recovery", n: t.priority_recovery, title: "Priority recovery", alarm: false,
      sub: "Earlier enquiry never followed up", target: calls.find((c) => c.flags.includes("priority_recovery"))?.id ?? null,
    },
  ].filter(Boolean) as { key: string; n: number; title: string; alarm: boolean; sub: string; target: number | null }[];
  const attentionTotal = attention.reduce((s, a) => s + a.n, 0);

  const pct = t.total ? Math.round((t.after_hours / t.total) * 100) : 0;
  const segments = (Object.keys(RESULT) as (keyof typeof RESULT)[]).map((k) => ({ k, count: t[k as keyof Totals] as number, ...RESULT[k] }));

  const avgCall = t.with_duration && t.total_seconds !== null
    ? (t.total_seconds / t.with_duration < 90 ? `${Math.round(t.total_seconds / t.with_duration)} sec` : `${(t.total_seconds / t.with_duration / 60).toFixed(1)} min`)
    : null;
  const tokens = t.openai_tokens ? `${t.openai_tokens.toLocaleString("en-IN")} tokens` : null;
  const voiceCost = t.with_cost && t.total_cost_credits !== null ? `${t.total_cost_credits.toFixed(1)} credits` : null;
  const costRows: [string, string | null][] = [
    ["Avg call length", avgCall],
    ["OpenAI usage", tokens],
    ["Response time", null],
    ["Voice cost (Vaani)", voiceCost],
  ];
  const anyMissing = costRows.some(([, v]) => v === null);

  return (
    <div className="page">
      <header className="top">
        <div className="brand"><span className="logo">Aangan</span><span className="tag">Phone enquiries</span></div>
        <div className="updated"><span className="dot" />Updated {updated}</div>
      </header>

      <div className="grid">
        {/* Attention column */}
        <section className="col-left">
          <div className="att-label">Needs attention{attentionTotal ? ` · ${attentionTotal}` : ""}</div>
          {attention.length === 0 ? (
            <div className="att-row calm"><span className="att-title">Nothing needs your attention</span></div>
          ) : attention.map((a) => (
            <button key={a.key} className={`att-row ${a.alarm ? "alarm" : ""}`} onClick={() => a.target !== null && setOpenId(a.target)}>
              <span className="att-n">{a.n}</span>
              <span className="att-text"><span className="att-title">{a.title}</span><span className="att-sub">{a.sub}</span></span>
              <span className="chev">›</span>
            </button>
          ))}

          <div className="cost-card">
            <div className="cost-title">Time and running cost</div>
            {costRows.map(([label, value]) => (
              <div className="cost-row" key={label}>
                <span className="muted">{label}</span>
                <span className={value === null ? "muted" : ""}>{value ?? "Not available"}</span>
              </div>
            ))}
            {anyMissing && <div className="foot">Vaani doesn&apos;t report these yet.</div>}
          </div>
        </section>

        {/* Main column */}
        <section className="col-main">
          <div className="hero">
            <div><div className="hero-label">Calls answered</div><div className="hero-n">{t.total}</div></div>
            <div className="hero-right">
              <div className="hero-ah">{t.after_hours}</div>
              <div className="hero-label">after hours{t.total ? ` · ${pct}%` : ""}</div>
            </div>
          </div>

          <div className="stats">
            <div className="stat"><div className="muted s-label">Consultations booked</div><div className="s-n">{t.booked}</div><div className="note muted">Confirmed in Cal.com</div></div>
            <div className="stat"><div className="muted s-label">Handoffs emailed</div><div className="s-n">{t.handoff_sent}</div>
              {t.handoff_failed > 0 ? <div className="note alert">{t.handoff_failed} failed</div> : <div className="note muted">None failed</div>}</div>
            <div className="stat"><div className="muted s-label">Deals in HubSpot</div><div className="s-n">{t.deals}</div></div>
            <div className="stat"><div className="muted s-label">Asked about price</div><div className="s-n">{t.price_asked}</div><div className="note muted">Given the standard reply</div></div>
          </div>

          <div className="qual">
            <div className="muted s-label">{t.total ? `How the ${t.total} calls qualified` : "How calls qualified"}</div>
            <div className="bar">
              {t.total === 0
                ? <div className="seg" style={{ flexGrow: 1, background: "var(--line)" }} />
                : segments.filter((s) => s.count > 0).map((s) => <div className="seg" key={s.k} style={{ flexGrow: s.count, background: s.color }} />)}
            </div>
            <div className="legend">
              {segments.map((s) => (
                <div key={s.k}><span className="l-n" style={{ color: s.k === "escalate" ? "var(--ink)" : s.color }}>{s.count}</span><span className="muted note">{s.label}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent calls column */}
        <section className="col-right">
          <div className="calls-head"><span className="calls-title">Recent calls</span><span className="muted note">Tap for details</span></div>
          <div className="calls-list">
            {calls.length === 0 && <div className="empty">No calls yet. They appear here after the first call ends.</div>}
            {calls.map((c) => {
              const r = RESULT[c.status ?? ""] ?? { label: c.status ?? "Unknown", color: "var(--muted)" };
              const open = openId === c.id;
              return (
                <div key={c.id} className={`call ${open ? "open" : ""}`}>
                  <button className="call-btn" aria-expanded={open} onClick={() => setOpenId(open ? null : c.id)}>
                    <span className="c-dot" style={{ background: r.color }} />
                    <span className="c-main">
                      <span className="c-name">{c.name ?? "Unknown"} {c.phoneLast4 && <span className="c-phone">•••• {c.phoneLast4}</span>}</span>
                      <span className="note muted">{r.label} · {fmtWhen(c.receivedAt)}</span>
                    </span>
                    <span className={`c-handoff ${c.handoff === "failed" ? "alert strong" : c.handoff === "sent" ? "" : "muted"}`}>{HANDOFF[c.handoff] ?? c.handoff}</span>
                  </button>
                  {open && (
                    <div className="detail">
                      <div>{c.reason || "No reason recorded."}</div>
                      <div className="muted">Consultation: {c.consultationAt ? fmtSlot(c.consultationAt) : "None"}{c.afterHours ? " · after hours" : ""}</div>
                      {c.flags.map((f) => <div className="pill" key={f}>{FLAG[f] ?? f.replace(/_/g, " ")}</div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
