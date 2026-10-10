// Takes one finished call, reads it with OpenAI, applies the rules, and saves the result in Neon.
import { sql } from "./db";
import { extractFacts } from "./extract";
import { decide } from "./qualification";
import { sendHandoff } from "./handoff";

export type FinishedCall = {
  vaaniCallId: string;
  transcript: string | null;
  summary: string | null;
  callerPhone: string | null;
  durationSeconds: number | null;
  startedAt: Date;
  raw: unknown;
};

// 10am to 7pm India time counts as office hours.
function isAfterHours(d: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(d)) % 24;
  return hour < 10 || hour >= 19;
}

export async function processCall(call: FinishedCall) {
  const db = sql();

  // A call with no transcript cannot be classified. Save it so it is visible, and say why.
  if (!call.transcript || call.transcript.trim().length < 20) {
    await db.query(
      `INSERT INTO calls (vaani_call_id, after_hours, caller_phone, summary, duration_seconds, status, reason, raw_payload)
       VALUES ($1,$2,$3,$4,$5,'needs_clarification','No usable transcript was received for this call.',$6)
       ON CONFLICT (vaani_call_id) DO NOTHING`,
      [call.vaaniCallId, isAfterHours(call.startedAt), call.callerPhone, call.summary, call.durationSeconds, JSON.stringify(call.raw)],
    );
    return { status: "needs_clarification" as const, saved: true };
  }

  const { facts, tokens } = await extractFacts(call.transcript, call.startedAt);
  const decision = decide(facts);

  await db.query(
    `INSERT INTO calls (vaani_call_id, after_hours, caller_name, caller_phone, transcript, summary, duration_seconds,
                        openai_tokens, facts, status, reason, flags, price_asked, raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (vaani_call_id) DO UPDATE SET
       transcript = EXCLUDED.transcript, summary = COALESCE(EXCLUDED.summary, calls.summary), duration_seconds = COALESCE(EXCLUDED.duration_seconds, calls.duration_seconds),
       openai_tokens = EXCLUDED.openai_tokens, facts = EXCLUDED.facts, status = EXCLUDED.status, reason = EXCLUDED.reason,
       flags = EXCLUDED.flags, price_asked = EXCLUDED.price_asked, raw_payload = EXCLUDED.raw_payload`,
    [
      call.vaaniCallId, isAfterHours(call.startedAt), facts.caller_name, call.callerPhone ?? facts.caller_phone,
      call.transcript, call.summary, call.durationSeconds, tokens, JSON.stringify(facts),
      decision.status, decision.reason, decision.flags, facts.asked_for_price, JSON.stringify(call.raw),
    ],
  );

  // Qualified enquiries and escalations are handed to a designer by email.
  let handoff: "sent" | "failed" | "not_needed" = "not_needed";
  const already = (await db.query("SELECT handoff_status FROM calls WHERE vaani_call_id=$1", [call.vaaniCallId]))[0]?.handoff_status === "sent";
  if (already) handoff = "sent"; // a repeat delivery of the same call must not email the designer twice
  else if (decision.status === "qualified" || decision.status === "escalate") {
    try {
      await sendHandoff({
        status: decision.status, reason: decision.reason, flags: decision.flags, callerName: facts.caller_name,
        callerPhone: call.callerPhone ?? facts.caller_phone, facts, summary: call.summary, consultation: null,
      });
      handoff = "sent";
      await db.query("UPDATE calls SET handoff_status='sent', handoff_error=NULL WHERE vaani_call_id=$1", [call.vaaniCallId]);
    } catch (e) {
      handoff = "failed";
      await db.query("UPDATE calls SET handoff_status='failed', handoff_error=$2 WHERE vaani_call_id=$1", [call.vaaniCallId, String(e).slice(0, 300)]);
    }
  }
  return { status: decision.status, saved: true, handoff };
}
