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

  const ms = num(data.call_duration); // post-processing sends milliseconds
  const ts = num(body.timestamp);
  try {
    const result = await processCall({
      vaaniCallId: callId,
      transcript: str(data.transcript),
      summary: str(data.summary),
      callerPhone: str(data.from_number) ?? str(data.phone_number) ?? null,
      durationSeconds: ms === null ? null : ms / 1000,
      startedAt: ts ? new Date(ts > 1e12 ? ts : ts * 1000) : new Date(),
      raw: body,
    });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("processing failed:", e);
    return new Response("Processing failed", { status: 500 }); // Vaani will retry
  }
}
