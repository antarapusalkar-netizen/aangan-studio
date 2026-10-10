// Looks in Cal.com for the consultation the caller booked during the call.
// The agent's booking tool sometimes tells the agent "failed" even when Cal.com made the booking,
// so after each call we ask Cal.com directly and record what is really booked.
export type Booking = { id: string; start: string };

export async function findBooking(callerName: string | null, callerPhone: string | null, callStart: Date): Promise<Booking | null> {
  const key = process.env.CAL_API_KEY;
  if (!key || (!callerName && !callerPhone)) return null;
  const res = await fetch("https://api.cal.com/v2/bookings?status=upcoming", {
    headers: { Authorization: `Bearer ${key}`, "cal-api-version": "2024-08-13" },
  });
  if (!res.ok) throw new Error(`Cal.com ${res.status}`);
  const bookings: any[] = (await res.json()).data ?? [];
  const digits = (s: string) => s.replace(/\D/g, "").slice(-10);
  const earliest = callStart.getTime() - 60 * 60 * 1000; // booking must have been made around the call
  const match = bookings.find((b) => {
    if (b.createdAt && new Date(b.createdAt).getTime() < earliest) return false;
    return (b.attendees ?? []).some((a: any) =>
      (callerName && a.name?.toLowerCase().trim() === callerName.toLowerCase().trim()) ||
      (callerPhone && a.phoneNumber && digits(a.phoneNumber) === digits(callerPhone)));
  });
  return match ? { id: String(match.uid ?? match.id), start: match.start } : null;
}

export function formatSlot(startIso: string): string {
  return new Date(startIso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" }) + " IST";
}
