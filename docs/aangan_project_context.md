# Aangan Studio: project context (for drafting a Claude Code prompt)

Paste this whole file into GPT and ask it to write a first prompt (and a CLAUDE.md spec) for Claude Code. The component map image (`aangan_component_map_v4.png`) goes with it.

## 1. The case (MESA AI and its Application, Case 03: "Nikhil: Unanswered Enquiries")

- **Client:** Nikhil Deshpande, founder of Aangan Studio, Pune. Interior design for homes and small offices. 60 people, 14 designers.
- **Problem:** about 200 enquiries a month. About 48% get no response within 48 hours. An enquiry answered within an hour converts at 4x the rate of one answered the next day. About 33% arrive outside 10am to 7pm. The front desk is two people. Enquiries reach designers as forwarded messages with no context, so the designer's first call re-asks what the front desk already asked. Average project value is Rs 8 to 14 lakh.
- **Nikhil's ask (three parts):** (1) every enquiry answered in five minutes, day or night; (2) worthwhile enquiries reach a designer with everything already asked; (3) the system quotes standard per-square-foot pricing.
- **Scope of the build:** incoming phone calls only. WhatsApp and the web form are out of scope, noted only as extensions.
- **Also required:** a handoff note to a designer (Telegram or email, student's choice, to be defended). A dashboard so Nikhil never pulls numbers by hand, showing what the system generates and what it costs to run, including the cost of the tool itself.
- **Source files given:** enquiries transcripts (20 phone, 10 WhatsApp, 10 web form), services.md, pricing.md, qualified.md.

## 2. Pre-read deliverables (all done)

1. **Automation Brief:** Pain, User, Outcome, Journey Today (one-page image made).
2. **Nine Checks:** all passed. The framework groups them as Kill Switches (01 to 03), Sizing (04, 05, 08), Boundary (06, 07, 09). **The Cut:** the automated per-square-foot price quote. It fails Check 03 (input not available on a call: pricing.md says "indicative only, varies by site"), reinforced by 06 and 07. pricing.md confirms it: it says no number, range or per-sq-ft figure may ever be quoted, and gives the one allowed reply.
3. **Component Map:** Trigger, Input, Context, Processing, AI, Output (image attached).

## 3. Decisions made

- **Voice platform:** Vaani Labs (voice synthesis, telephony, call orchestration). A Vaani API key named "Aangan Studio" has been created. No agent created yet and no phone number yet. The user does not want to create the agent by hand, and wants Claude Code to do it if Vaani's API allows (not confirmed; needs checking in Vaani's docs).
- **Classification and routing AI:** OpenAI API (the class stack slide said Gemini Flash; the user changed it to OpenAI).
- **Database:** Neon (Postgres).
- **Handoff to designer:** email via Resend. (The user chose Resend over Telegram. Resend may need a verified sender domain; unchecked.)
- **CRM:** HubSpot. Qualified calls become deals.
- **Calendar:** Cal.com.
- **Dashboard hosting:** Vercel. **Code:** GitHub. **Built with:** Claude Chat (logic), then Claude Code (the build).

## 4. Component map (text version of the image)

| Stage | Component |
|---|---|
| Trigger | Caller dials the studio number, any hour |
| Input | Vaani Labs captures live speech and caller number, transcribed |
| Context | Agent loaded with services.md info and Nikhil's qualified rules |
| Processing | Vaani runs the call: asks the front-desk questions, offers a consultation slot, quotes no price |
| AI | OpenAI API classifies the call as qualified or not and routes it |
| Output | Caller gets an answer and a booked consultation. Cal.com books the slot. HubSpot gets a deal for qualified calls. Resend emails the designer the handoff note. Neon stores the call log (time, details, tag, running cost). Dashboard on Vercel shows response time, qualified calls and cost. |

Glue: small functions built in Claude Code (hosted on Vercel) pass Vaani's end-of-call data to OpenAI, HubSpot, Neon and Resend. This glue layer is an addition, not on the class stack slide.

## 5. Accounts and environment variables (names only, never paste real keys)

`VAANI_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL` (Neon), `HUBSPOT_ACCESS_TOKEN`, `CAL_API_KEY`, `RESEND_API_KEY`. Store in `.env.local`, add it to `.gitignore` before the first commit, and add the same variables in Vercel. The Neon connection string must be used server-side only.

## 6. Cal.com state

- Public link: https://cal.com/antara-pusalkar-lesxpy/design-consultation
- Event type ID: 7423526
- Currently set to 25 minutes, location "Phone call" (not yet decided; the transcripts show consultations as site visits at the property, so in-person is the likely better fit, but it is the user's decision). Availability looks like Monday to Friday. Cal.com API key not yet created.
- Open question: weekend or evening slots (some callers ask for them).

## 7. Qualification logic (draft, from the supplied files)

**Questions the voice agent asks, in order:** what are you looking to do; where is the property; home or office and carpet area; which rooms or scope, and is it design with full execution; when must it be complete; are you the owner or will the decision-makers attend; current state of the space; name, number, and a consultation slot. Budget is never asked.

**Rules:**
- **Scope check (from services.md):** residential, or office of about 500 to 3,000 sq ft. Not restaurants, hotels, retail, gyms, or advice-only work.
- **1. Real project:** design with full execution, not advice. Minimum is a room redesign with execution.
- **2. Service area:** Pune city and PCMC only (area list in services.md). Not Talegaon, Nashik, Mumbai, Lonavala.
- **3. Realistic timeline:** execution site available within 8 to 10 weeks of consultation. If unclear, ask one direct question.
- **4. Budget:** never quote, never probe. Decline only if the caller volunteers a number clearly below the scope (for example Rs 1 to 1.5 lakh for a full flat). If budget not mentioned, treat as qualified.
- **5. Decision-maker:** if unclear, do not push, treat as qualified and flag in the handoff note.
- Unclear on 1, 2, 3: ask one question. Unclear on 4 or 5: treat as qualified and note it. Two or more fail: decline gracefully ("This sounds like it may not be the right fit for us right now, but feel free to reach out if your timeline or scope changes.").
- **Never disqualifies:** not knowing exactly what they want, calling outside office hours (answer, qualify, book), asking for pricing (deflect, do not disqualify), uncertainty about materials or style, a single-room project, a rented apartment with no structural changes.
- **Pricing reply (the only allowed one, from pricing.md):** "Pricing depends on the site, the materials you choose, and the scope. Your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like." Never say any figure, range, "it'll cost around...", "rates start at...", or typical cost for a 2BHK.

**Handoff note template:** name and number; project (residential or office, full home / rooms / floor); location; size (carpet area); current state; timeline; decision-maker (confirmed or flagged); referral source; price asked (yes, deflected, or no); budget volunteered; consultation (site visit or office visit, slot booked); flags (priority recovery, dropped call merged, uncertainty on timeline or decision-maker).

## 8. Test results on the 20 phone transcripts

- **Qualified (clear):** T01, T05, T06, T11, T12, T13, T15, T17, T20.
- **Qualified with a note:** T02 (timeline needs the "when must it be complete?" question; asked for a price, accepted the deflection), T14 (son calling for parents, flag decision-maker), T16 (earlier enquiry never followed up, priority recovery).
- **Borderline:** T07 (wanted it done before Diwali in three weeks, but a November start works).
- **Decline:** T03 (Nashik, area), T04 (advice only), T10 (volunteered budget Rs 1 to 1.5 lakh, too low), T18 (180 sq ft, below commercial minimum), T19 (restaurant, out of scope).
- **Escalate (not an enquiry):** T09 (existing client, designer silent for five days, wants a senior callback).
- **Missed call:** T08 (10:47pm); an always-on agent would have answered it.
- T17 had a dropped first call and a second call; the two should be merged into one record.

## 9. Open questions (unresolved, to raise with Nikhil or settle with defaults)

1. qualified.md says "fails one, close gracefully" but also "two or more fail, decline". The real calls were declined on a single fail. Suggested default: decline on a single clear fail on criteria 1, 2 or the scope check.
2. Timeline threshold: qualified.md says 8 to 10 weeks; services.md says under 6 weeks from today cannot begin, with a 3 to 4 week design phase plus 8 to 16 weeks execution. Suggested default: use qualified.md (8 to 10 weeks) and treat anything in the gap as "ask one question".
3. Existing clients and chasers (T09, T16) are not covered by the rubric. Suggested default: an escalate route that alerts a senior person.
4. Borderline calls like T07 (can start later). Suggested default: treat as qualified with a flag and offer a later start.
5. How a designer is assigned to a handoff is not stated in the case. Suggested default: one shared consultation calendar and one shared email address.
These are suggestions; none has been confirmed by the user.

## 10. Dashboard requirements

Response time, number of calls, qualified vs declined, after-hours share, handoff delivered, and running cost of the tool (Vaani call minutes and cost, OpenAI tokens, any other usage). Vaani's own overview shows total calls, duration and cost in rupees, so check whether the call-ended webhook or API returns cost and duration. Phone-only baselines are not separated out in the case numbers (the 48% and 4x figures cover all channels).

## 11. Build order and unknowns

1. Create remaining accounts and keys (Neon, OpenAI, HubSpot, Resend, Cal.com API key). Vaani key done.
2. In Vaani: find out whether its API can create agents, how a phone number is provided (Twilio or Vonage, cost), whether it integrates with Cal.com directly, and what the end-of-call webhook sends (transcript, duration, cost, caller number). A webhook URL needs a deployed address, so it comes after the first Vercel deploy.
3. Claude Code builds the glue functions, the database schema, the dashboard, and the agent (if the API allows) from a CLAUDE.md spec.
4. Test using the 20 phone transcripts as scripted calls.
5. Deploy to Vercel, commit to GitHub after each working piece.

## 12. What to ask GPT

"Using the context above and the attached component map, write (a) a CLAUDE.md for this project and (b) a first prompt for Claude Code. The prompt must be staged (start with the database schema and the qualification logic, then the call-ended handler, then the integrations, then the dashboard), must never hard-code keys, must forbid the agent from ever stating a price, and must ask Claude Code to read Vaani's docs before building and tell me what it can and cannot do through Vaani's API."
