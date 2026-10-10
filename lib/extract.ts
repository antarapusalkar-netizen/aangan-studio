// Asks OpenAI to read a call transcript and fill in the plain facts that the rules need.
// OpenAI does NOT decide qualified/declined. lib/qualification.ts does that.
import OpenAI from "openai";
import { timelineFrom, type Facts } from "./qualification";

const MODEL = "gpt-4o-mini";

export type Extracted = Facts & {
  caller_name: string | null;
  caller_phone: string | null;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "property_type", "work", "location", "carpet_area_sqft", "timeline_weeks", "can_start_later", "decision_maker", "budget",
    "existing_client_issue", "earlier_enquiry_not_followed_up", "asked_for_price", "caller_name", "caller_phone",
  ],
  properties: {
    property_type: { type: "string", enum: ["home", "office", "other", "unclear"] },
    work: { type: "string", enum: ["design_and_execution", "advice_only", "unclear"] },
    location: { type: "string", enum: ["pune_pcmc", "outside", "unclear"] },
    carpet_area_sqft: { type: ["number", "null"] },
    timeline_weeks: { type: ["number", "null"] },
    can_start_later: { type: "boolean" },
    decision_maker: { type: "string", enum: ["confirmed", "unclear"] },
    budget: { type: "string", enum: ["not_mentioned", "clearly_insufficient", "ok"] },
    existing_client_issue: { type: "boolean" },
    earlier_enquiry_not_followed_up: { type: "boolean" },
    asked_for_price: { type: "boolean" },
    caller_name: { type: ["string", "null"] },
    caller_phone: { type: ["string", "null"] },
  },
} as const;

const INSTRUCTIONS = `You read a phone-call transcript between a caller and the front-desk voice agent of Aangan Studio, an interior design studio in Pune, India. Fill in the fields. Report only what the caller actually said. If something was not said, use "unclear" (or null). Never guess.

Fields:
- property_type: "home" (house, flat, villa), "office" (small office), "other" (restaurant, hotel, retail shop, gym, clinic, etc.), "unclear".
- work: "design_and_execution" if they want design and the studio to carry out the work. "advice_only" if they only want advice and will do the work themselves. "unclear" otherwise.
- location: "pune_pcmc" if in Pune city or Pimpri-Chinchwad (areas such as Baner, Kothrud, Hinjewadi, Wakad, Aundh, Kharadi, Viman Nagar, Pashan, Balewadi, Bavdhan, Magarpatta, Koregaon Park, Camp, Pimple Saudagar). "outside" if anywhere else (Nashik, Mumbai, Lonavala, Talegaon...). "unclear" if not said.
- carpet_area_sqft: the number the caller gave, or null.
- timeline_weeks: how many weeks from now until the caller needs the work finished or the site ready, as a number (1 month = about 4.3 weeks, 3 months = about 13 weeks). null if no timeline was given. Do not judge whether it is realistic.
- can_start_later: true ONLY if the caller first wanted it sooner and then said a later start would also work. Otherwise false.
- decision_maker: "confirmed" if the caller is the owner/decision-maker or says the decision-makers will attend. "unclear" if the caller is calling for someone else or it was not said.
- budget: "clearly_insufficient" ONLY if the caller volunteered a budget far too low for the work (for example 1 to 1.5 lakh for a whole flat). "ok" if they volunteered a reasonable one. Otherwise "not_mentioned". The agent never asks about budget.
- existing_client_issue: true if the caller is an existing client with an unresolved problem with their current project.
- earlier_enquiry_not_followed_up: true if they say they enquired before and nobody got back to them.
- asked_for_price: true if the caller asked about cost, rates or price at any point.
- caller_name, caller_phone: as given in the call, or null.`;

export async function extractFacts(transcript: string, callDate: Date = new Date()): Promise<{ facts: Extracted; tokens: number }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: `${INSTRUCTIONS}\n\nThe call took place on ${callDate.toISOString().slice(0, 10)}. Use this date to turn months or dates the caller mentions into weeks from now.` },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_schema", json_schema: { name: "call_facts", strict: true, schema } },
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no content");
  const raw = JSON.parse(text) as Omit<Extracted, "timeline"> & { timeline_weeks: number | null; can_start_later: boolean };
  const { timeline_weeks, can_start_later, ...rest } = raw;
  return { facts: { ...rest, timeline: timelineFrom(timeline_weeks, can_start_later) }, tokens: res.usage?.total_tokens ?? 0 };
}
