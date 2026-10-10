# Vaani (app.vaanivoice.ai) — what the docs say

Source: https://docs.vaanivoice.ai (llms.txt index, OpenAPI, guide pages). Read 2026-10-10. Nothing here is tested yet.

Base URL `https://api.vaanivoice.ai`, header `X-API-Key: vaani_...`.

| Need | Status |
|---|---|
| Create agent by API | Yes: `POST /api/create-agent`, then PATCH `/persona`, `/training`, `/experience`, `/analysis`, `/deployment` |
| Set system prompt, greeting, LLM, voice | Yes: PATCH persona (`identity.system_prompt`, `identity.greeting_message`) |
| Phone number | Dashboard only (Settings > Telephony). Vaani can provision one, or bring your own SIP trunk. Indian numbers unconfirmed. |
| Route inbound calls to agent | Yes: PATCH deployment `phone.call_type.Inbound` = number (E.164) |
| Webhook to our server | Yes, set in dashboard (Settings > Webhooks). Events: `call_started`, `call_ended`, `call_postprocessing` |
| Transcript, summary, entities, recording | In the `call_postprocessing` webhook, and via `GET /api/call_details`, `/api/transcript` |
| Duration | `call_ended` and `call_postprocessing` (units differ: seconds vs milliseconds); also `duration_ms` in call history |
| Cost | `call_cost` (in "credits") in `GET /api/call-history`. Not in any webhook. |
| Caller number | `from_number` in call history. Not documented in inbound webhook events. |
| Webhook signature / retries | Not documented. Treat the endpoint as unauthenticated unless support says otherwise. |
| Cal.com booking during call | Yes, dashboard only (Settings > Integrations > Cal.com): paste Cal API key, choose event type |
| Custom tools (call our server mid-call) | Yes, dashboard (paste cURL). API field `actions` is undocumented. |

Open questions to verify with a test call: caller number on inbound, whether "credits" equal rupees, and the exact inbound webhook payload.
