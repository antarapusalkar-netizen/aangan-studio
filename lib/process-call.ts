// Takes one finished call, reads it with OpenAI, applies the rules, and saves the result in Neon.
import { sql } from "./db";
import { extractFacts } from "./extract";
import { decide } from "./qualification";
import { sendHandoff } from "./handoff";
import { findBooking, formatSlot } from "./cal";
import { createDeal, hubspotConfigured } from "./hubspot";

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

  const phone = call.callerPhone ?? facts.caller_phone;
  const isQualified = decision.status === "qualified";

  // 1. Which consultation did Cal.com actually book? (Best effort: a failure here must not lose the call.)
  let consultation: string | null = null;
  if (isQualified) {
    try {
      const booking = await findBooking(facts.caller_name, phone, call.startedAt);
      if (booking) {
        consultation = formatSlot(booking.start);
        await db.query("UPDATE calls SET consultation_at=$2, cal_booking_id=$3 WHERE vaani_call_id=$1", [call.vaaniCallId, booking.start, booking.id]);
      }
    } catch (e) { console.error("cal lookup failed:", e); }
  }

  // 2. HubSpot deal for qualified calls (skipped when no token is set, and never created twice).
  if (isQualified && hubspotConfigured()) {
    try {
      const existing = (await db.query("SELECT hubspot_deal_id FROM calls WHERE vaani_call_id=$1", [call.vaaniCallId]))[0]?.hubspot_deal_id;
      if (!existing) {
        const dealId = await createDeal({ name: facts.caller_name, phone, summaryLine: call.summary ?? decision.reason });
        await db.query("UPDATE calls SET hubspot_deal_id=$2 WHERE vaani_call_id=$1", [call.vaaniCallId, dealId]);
      }
    } catch (e) { console.error("hubspot failed:", e); }
  }

  // 3. Qualified enquiries and escalations are handed to a designer by email (once only).
  let handoff: "sent" | "failed" | "not_needed" = "not_needed";
  const already = (await db.query("SELECT handoff_status FROM calls WHERE vaani_call_id=$1", [call.vaaniCallId]))[0]?.handoff_status === "sent";
  if (already) handoff = "sent";
  else if (isQualified || decision.status === "escalate") {
    try {
      await sendHandoff({
        status: decision.status, reason: decision.reason, flags: decision.flags, callerName: facts.caller_name,
        callerPhone: phone, facts, summary: call.summary, consultation,
      });
      handoff = "sent";
      await db.query("UPDATE calls SET handoff_status='sent', handoff_error=NULL WHERE vaani_call_id=$1", [call.vaaniCallId]);
    } catch (e) {
      handoff = "failed";
      await db.query("UPDATE calls SET handoff_status='failed', handoff_error=$2 WHERE vaani_call_id=$1", [call.vaaniCallId, String(e).slice(0, 300)]);
    }
  }
  return { status: decision.status, saved: true, handoff, consultation };
}
