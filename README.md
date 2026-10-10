# Aangan Studio: phone enquiry system

A voice agent (Vaani) answers enquiry calls for Aangan Studio, an interior design studio in Pune. When a call ends, Vaani sends the call to this app, which reads it with OpenAI, applies the qualification rules, saves it in Neon, books/looks up the Cal.com consultation, creates a HubSpot deal for qualified enquiries, emails the designer (Resend) and shows everything on a password-protected dashboard.

Phone calls only. WhatsApp and web forms are out of scope.

## How it fits together
- `agent/system-prompt.ts` — what the voice agent says (includes the one allowed pricing reply). `npm run agent:create` pushes it to Vaani.
- `app/api/vaani-webhook/route.ts` — receives the finished call (needs `?token=WEBHOOK_TOKEN`).
- `lib/extract.ts` — OpenAI turns the transcript into plain facts.
- `lib/qualification.ts` — the rules. Edit rules here; defaults are marked `DEFAULT`.
- `lib/cal.ts`, `lib/hubspot.ts`, `lib/handoff.ts` — Cal.com, HubSpot, Resend.
- `app/page.tsx` — the dashboard. It is open to anyone with the link; phone numbers are masked.
- `db/schema.sql` — the one `calls` table. `npm run setup:db` creates it.

## Run it yourself
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in every value. Never commit `.env.local`.
3. `npm run setup:db`, then `npm run dev`.

## Tests
- `npm run test:rules` — rules against 20 scripted calls (no internet).
- `npm run test:extraction` — the same 20 calls through OpenAI (uses your OpenAI key).
The 20 calls are scripted from the project brief, not the original transcripts.

## Known gaps
- Vaani does not report time-to-answer or (so far) call cost in the webhook, so the dashboard shows "Not available" for those.
- Vaani's booking tool can report an error even when Cal.com made the booking. The app checks Cal.com after the call.
- Resend without a verified domain only delivers to the account owner's address.
