import { Suspense } from "react";
import { connection } from "next/server";
import { getStats } from "@/lib/stats";

const STATUS: Record<string, { label: string; color: string }> = {
  qualified: { label: "Qualified", color: "var(--ok)" },
  declined: { label: "Declined", color: "var(--bad)" },
  needs_clarification: { label: "Needs clarification", color: "var(--warn)" },
  escalate: { label: "Escalated", color: "var(--neutral)" },
};

const mins = (s: number) => (s < 90 ? `${Math.round(s)}s` : `${(s / 60).toFixed(1)} min`);
const maskPhone = (p: string | null) => (p ? `•••• ${p.replace(/\D/g, "").slice(-4)}` : "no number");
const when = (d: string | Date) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Tile({ label, value, note }: { label: string; value: string | number | null; note?: string }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      {value === null ? <div className="na">Not available</div> : <div className="value">{value}</div>}
      {note && <div className="note">{note}</div>}
    </div>
  );
}

export default function Page() {
  return (
    <main>
      <h1>Aangan Studio calls</h1>
      <p className="sub">Inbound enquiries answered by the voice agent. Numbers come straight from the call records; anything not reported shows as “Not available”.</p>
      <Suspense fallback={<p className="muted">Loading calls…</p>}><Dashboard /></Suspense>
    </main>
  );
}

async function Dashboard() {
  await connection(); // always read fresh data on each visit
  let data;
  try { data = await getStats(); } catch (e) {
    return <p className="muted">Could not read the database. Check DATABASE_URL.</p>;
  }
  const { t, recent } = data;
  const pct = (n: number) => (t.total ? `${Math.round((n / t.total) * 100)}%` : "0%");

  return (
    <>
      <div className="tiles">
        <Tile label="Calls answered" value={t.total} />
        <Tile label="After hours" value={t.after_hours} note={`${pct(t.after_hours)} of calls, outside 10am to 7pm`} />
        <Tile label="Consultations booked" value={t.booked} note="Confirmed in Cal.com" />
        <Tile label="Deals in HubSpot" value={t.deals} />
        <Tile label="Handoffs emailed" value={t.handoff_sent} note={t.handoff_failed ? `${t.handoff_failed} failed to send` : "None failed"} />
        <Tile label="Asked about price" value={t.price_asked} note="Always given the standard reply" />
      </div>

      <h2>Qualification results</h2>
      <div className="panel">
        {t.total === 0 ? <div className="empty">No calls yet.</div> : Object.entries(STATUS).map(([key, s]) => {
          const n = t[key] as number;
          return (
            <div className="bar-row" key={key}>
              <span>{s.label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: pct(n), background: s.color }} /></div>
              <strong>{n}</strong>
            </div>
          );
        })}
      </div>

      <h2>Time and running cost</h2>
      <div className="tiles">
        <Tile label="Response time" value={null} note="Vaani does not report time-to-answer" />
        <Tile label="Average call length" value={t.with_duration ? mins(t.total_seconds / t.with_duration) : null} note={t.with_duration ? `From ${t.with_duration} calls that reported it` : undefined} />
        <Tile label="Voice cost (Vaani)" value={t.with_cost ? `${t.total_cost_credits.toFixed(1)} credits` : null} note={t.with_cost ? "Vaani credits, as reported" : "Vaani cost is not in the call data yet"} />
        <Tile label="OpenAI usage" value={t.openai_tokens ? `${t.openai_tokens.toLocaleString("en-IN")} tokens` : null} note="Actual tokens used to read calls" />
      </div>

      <h2>Recent calls</h2>
      <div className="panel table-wrap">
        {recent.length === 0 ? <div className="empty">No calls yet. They appear here after the first call ends.</div> : (
          <table>
            <thead><tr><th>When</th><th>Caller</th><th>Result</th><th>Consultation</th><th>Handoff</th><th>Why</th></tr></thead>
            <tbody>
              {recent.map((c: any) => {
                const s = STATUS[c.status] ?? { label: c.status ?? "Unknown", color: "var(--neutral)" };
                return (
                  <tr key={c.id}>
                    <td>{when(c.received_at)}{c.after_hours ? <div className="muted">after hours</div> : null}</td>
                    <td>{c.caller_name ?? <span className="muted">Unknown</span>}<div className="muted">{maskPhone(c.caller_phone)}</div></td>
                    <td><span className="pill" style={{ color: s.color }}>{s.label}</span>{(c.flags ?? []).map((f: string) => <div className="flag" key={f}>{f.replace(/_/g, " ")}</div>)}</td>
                    <td>{c.consultation_at ? when(c.consultation_at) : <span className="muted">None</span>}</td>
                    <td>{c.handoff_status === "sent" ? "Sent" : c.handoff_status === "failed" ? <span style={{ color: "var(--bad)" }}>Failed</span> : <span className="muted">Not needed</span>}</td>
                    <td>{c.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
