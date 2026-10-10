// 20 SCRIPTED phone calls, written from the outcomes summarised in docs/aangan_project_context.md section 8.
// They are NOT the real transcripts (we do not have those files). Replace them with the real ones when available.
// Each call has the transcript, the facts a correct reader should pull out, and the expected result.
import type { Facts, Status } from "@/lib/qualification";

export type ScriptedCall = {
  id: string;
  note: string;
  transcript: string;
  facts: Facts;
  expect: { status: Status; flags: string[] };
};

const base: Facts = {
  property_type: "home", work: "design_and_execution", location: "pune_pcmc", carpet_area_sqft: 1200,
  timeline: "ok", decision_maker: "confirmed", budget: "not_mentioned",
  existing_client_issue: false, earlier_enquiry_not_followed_up: false, asked_for_price: false,
};
const q = (flags: string[] = []) => ({ status: "qualified" as Status, flags });
const d = () => ({ status: "declined" as Status, flags: [] as string[] });

export const calls: ScriptedCall[] = [
  { id: "T01", note: "clear qualified: 3BHK Baner",
    transcript: "AGENT: What are you looking to do?\nCALLER: Full interiors for my 3BHK in Baner, about 1400 sq ft carpet.\nAGENT: And when would you like it complete?\nCALLER: In about three months. My wife and I will both come to the consultation.",
    facts: { ...base, carpet_area_sqft: 1400 }, expect: q() },
  { id: "T02", note: "asked price, deflected, accepted; timeline answered after the question",
    transcript: "CALLER: What is your rate per square foot?\nAGENT: Pricing depends on the site, the materials you choose, and the scope. Your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like.\nCALLER: Okay, book it.\nAGENT: When do you need the work complete?\nCALLER: By March. 2BHK in Wakad, full design and execution.",
    facts: { ...base, asked_for_price: true, carpet_area_sqft: 950 }, expect: q() },
  { id: "T03", note: "Nashik, outside area",
    transcript: "CALLER: I want my bungalow in Nashik done up, full interiors.\nAGENT: Which area is the property in?\nCALLER: Nashik, near College Road.",
    facts: { ...base, location: "outside" }, expect: d() },
  { id: "T04", note: "advice only",
    transcript: "CALLER: I only need someone to tell me what colours and furniture to pick. I will get it done myself.\nAGENT: Do you want us to handle the execution as well?\nCALLER: No, just advice.",
    facts: { ...base, work: "advice_only" }, expect: d() },
  { id: "T05", note: "clear qualified: Hinjewadi flat",
    transcript: "CALLER: New 2BHK in Hinjewadi, 1000 sq ft, empty shell. Need full interiors in 10 weeks. I am the owner.",
    facts: { ...base, carpet_area_sqft: 1000 }, expect: q() },
  { id: "T06", note: "clear qualified: Kothrud villa",
    transcript: "CALLER: Villa in Kothrud, 2500 sq ft, complete redesign with execution, ready for possession in 2 months. Both of us will attend.",
    facts: { ...base, carpet_area_sqft: 2500 }, expect: q() },
  { id: "T07", note: "wants it before Diwali in 3 weeks, but a November start works",
    transcript: "CALLER: I wanted it done before Diwali, three weeks.\nAGENT: Our process takes longer than that. Would a later start work?\nCALLER: Yes, we can start in November. Flat in Pimple Saudagar, 1100 sq ft, full execution.",
    facts: { ...base, timeline: "can_start_later", carpet_area_sqft: 1100 }, expect: q(["timeline_flexible_later_start"]) },
  { id: "T08", note: "10:47pm call, answered by the always-on agent (details assumed)",
    transcript: "CALLER: Sorry for the late call. Redesign of my 2BHK in Aundh, with execution, within 3 months, I decide with my husband.",
    facts: { ...base, carpet_area_sqft: 900 }, expect: q() },
  { id: "T09", note: "existing client, designer silent for five days",
    transcript: "CALLER: I am already your client. My designer has not replied for five days. I need a senior person to call me back.",
    facts: { ...base, existing_client_issue: true }, expect: { status: "escalate", flags: ["senior_callback"] } },
  { id: "T10", note: "volunteered budget Rs 1-1.5 lakh for a full flat",
    transcript: "CALLER: Full 3BHK in Viman Nagar. My budget is only about 1 to 1.5 lakh in total.",
    facts: { ...base, budget: "clearly_insufficient" }, expect: d() },
  { id: "T11", note: "clear qualified: Pashan",
    transcript: "CALLER: 2BHK Pashan, 850 sq ft, full interiors, need it in 2 months, I am the owner.",
    facts: { ...base, carpet_area_sqft: 850 }, expect: q() },
  { id: "T12", note: "clear qualified: single room, still fine",
    transcript: "CALLER: Just my living room and kitchen in a flat in Kharadi, but with full design and execution. Ready in 2 months.",
    facts: { ...base, carpet_area_sqft: 700 }, expect: q() },
  { id: "T13", note: "clear qualified: small office, 1200 sq ft Pune",
    transcript: "CALLER: Our office in Baner, 1200 sq ft, needs complete design and execution. Partners will all attend. Within 3 months.",
    facts: { ...base, property_type: "office", carpet_area_sqft: 1200 }, expect: q() },
  { id: "T14", note: "son calling for his parents; decision-maker flagged",
    transcript: "CALLER: I am calling for my parents. Their flat in Kothrud, 1000 sq ft, full interiors, in 3 months. They will decide, I am not sure they can come.",
    facts: { ...base, decision_maker: "unclear" }, expect: q(["decision_maker_unclear"]) },
  { id: "T15", note: "clear qualified: PCMC",
    transcript: "CALLER: Flat in Pimpri-Chinchwad, 1100 sq ft, full execution, 10 weeks, I am the owner.",
    facts: { ...base, carpet_area_sqft: 1100 }, expect: q() },
  { id: "T16", note: "earlier enquiry never followed up",
    transcript: "CALLER: I enquired two weeks ago and nobody called back. Flat in Balewadi, 1300 sq ft, full execution, 3 months, I am the owner.",
    facts: { ...base, carpet_area_sqft: 1300, earlier_enquiry_not_followed_up: true }, expect: q(["priority_recovery"]) },
  { id: "T17", note: "dropped first call, second call merged into one record",
    transcript: "[Call 1 dropped] CALLER: Hello, I want interiors for my... [line drops]\n[Call 2] CALLER: Sorry, call dropped. 3BHK in Bavdhan, 1500 sq ft, full design and execution, 3 months, I am the owner.",
    facts: { ...base, carpet_area_sqft: 1500 }, expect: q() },
  { id: "T18", note: "180 sq ft office, below commercial minimum",
    transcript: "CALLER: Small office, 180 sq ft in Camp. Full design and execution please.",
    facts: { ...base, property_type: "office", carpet_area_sqft: 180 }, expect: d() },
  { id: "T19", note: "restaurant, out of scope",
    transcript: "CALLER: I am opening a restaurant in Koregaon Park and need the interiors done.",
    facts: { ...base, property_type: "other", carpet_area_sqft: null }, expect: d() },
  { id: "T20", note: "clear qualified: Magarpatta",
    transcript: "CALLER: 3BHK Magarpatta, 1350 sq ft, full interiors, 3 months, owner and spouse will attend.",
    facts: { ...base, carpet_area_sqft: 1350 }, expect: q() },
];
