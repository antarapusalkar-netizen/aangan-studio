// Vaani calls this address when a call event happens.
// Register it in Vaani: Settings > Webhooks, as  https://YOUR-SITE/api/vaani-webhook?token=WEBHOOK_TOKEN
import { timingSafeEqual } from "node:crypto";
import { processCall } from "@/lib/process-call";

export const maxDuration = 60;

function tokenOk(given: string | null): boolean {
  const want = process.env.WEBHOOK_TOKEN;
  if (!want || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Vaani's docs do not guarantee any field, so read everything defensively.
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function POST(req: Request) {
  if (!tokenOk(new URL(req.url).searchParams.get("token"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const event = str(body?.event) ?? str(body?.type);
  const data = body?.data ?? {};
  console.log("vaani webhook event:", event, "keys:", Object.keys(data).join(","));

  // Only the post-processing event has the transcript, so that is the one we save.
  if (event !== "call_postprocessing") return Response.json({ ok: true, ignored: event });

  const callId = str(body.call_id) ?? str(data.call_id) ?? str(data.room_name);
  if (!callId) return new Response("No call id", { status: 400 });

  // Seen in a real call: call_duration is in SECONDS (44.24 for a 44-second call), although Vaani's docs say milliseconds.
  const seconds = num(data.call_duration);
  // Web test calls send "web-user" instead of a phone number, so only accept something that looks like a number.
  const phoneRaw = str(data.from_number) ?? str(data.phone_number) ?? str(body.from);
  const callerPhone = phoneRaw && /\d{7,}/.test(phoneRaw) ? phoneRaw : null;
  const started = new Date(str(data.call_started_at) ?? str(body.timestamp) ?? Date.now());
  try {
    const result = await processCall({
      vaaniCallId: callId,
      transcript: str(data.transcript),
      summary: str(data.summary),
      callerPhone,
      durationSeconds: seconds,
      startedAt: isNaN(started.getTime()) ? new Date() : started,
      raw: body,
    });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("processing failed:", e);
    return new Response("Processing failed", { status: 500 }); // Vaani will retry
  }
}
