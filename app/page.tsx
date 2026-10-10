import { Suspense } from "react";
import { connection } from "next/server";
import { getStats } from "@/lib/stats";
import DashboardView from "./DashboardView";

export default function Page() {
  return (
    <Suspense fallback={<div className="loading">Loading calls…</div>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection(); // always read fresh data on each visit
  let data;
  try {
    data = await getStats();
  } catch {
    return <div className="loading">Could not read the database. Check DATABASE_URL.</div>;
  }
  const updated = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
  const calls = data.recent.map((c: any) => ({
    id: c.id as number,
    receivedAt: new Date(c.received_at).toISOString(),
    name: (c.caller_name as string | null) ?? null,
    phoneLast4: c.caller_phone ? String(c.caller_phone).replace(/\D/g, "").slice(-4) || null : null,
    status: (c.status as string | null) ?? null,
    reason: (c.reason as string | null) ?? "",
    flags: ((c.flags as string[] | null) ?? []),
    afterHours: !!c.after_hours,
    consultationAt: c.consultation_at ? new Date(c.consultation_at).toISOString() : null,
    handoff: (c.handoff_status as string | null) ?? "not_needed",
  }));
  return <DashboardView t={data.t as any} calls={calls} updated={updated} />;
}
