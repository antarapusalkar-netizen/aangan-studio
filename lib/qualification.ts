// The qualification rubric. This file is the single place the rules live.
// Source: docs/aangan_project_context.md section 7 (qualified.md, services.md).
// Defaults from section 9 are marked DEFAULT so Nikhil can change them.

export type Facts = {
  // What kind of project it is.
  property_type: "home" | "office" | "other" | "unclear";
  // "other" = restaurant, hotel, retail, gym, etc.
  work: "design_and_execution" | "advice_only" | "unclear";
  location: "pune_pcmc" | "outside" | "unclear"; // Pune city or PCMC only
  carpet_area_sqft: number | null;
  timeline: "ok" | "too_soon" | "can_start_later" | "unclear";
  // ok = site ready within 8-10 weeks of the consultation
  // too_soon = needs it faster than we can, and cannot wait
  // can_start_later = asked for too soon but a later start works
  decision_maker: "confirmed" | "unclear";
  // Only set when the caller VOLUNTEERED a number. We never ask.
  budget: "not_mentioned" | "clearly_insufficient" | "ok";
  // Existing client calling about an unresolved problem.
  existing_client_issue: boolean;
  earlier_enquiry_not_followed_up: boolean;
  asked_for_price: boolean;
};

export type Status = "qualified" | "declined" | "needs_clarification" | "escalate";

export type Decision = {
  status: Status;
  reason: string;
  flags: string[];
  question?: string; // the one direct question to ask if status is needs_clarification
};

const OFFICE_MIN_SQFT = 500;
const OFFICE_MAX_SQFT = 3000;

export function decide(f: Facts): Decision {
  const flags: string[] = [];

  // Escalate: existing clients with a problem go to a senior person, not the enquiry rubric.
  if (f.existing_client_issue) {
    return { status: "escalate", reason: "Existing client with an unresolved issue; needs a senior person.", flags: ["senior_callback"] };
  }

  // Clear fails. DEFAULT 1: one clear fail on scope, area, real project, timeline or volunteered budget is enough to decline.
  const fails: string[] = [];
  if (f.property_type === "other") fails.push("project type is outside our services (not a home or small office)");
  if (f.property_type === "office" && f.carpet_area_sqft !== null &&
      (f.carpet_area_sqft < OFFICE_MIN_SQFT || f.carpet_area_sqft > OFFICE_MAX_SQFT)) {
    fails.push(`office size ${f.carpet_area_sqft} sq ft is outside ${OFFICE_MIN_SQFT}-${OFFICE_MAX_SQFT}`);
  }
  if (f.work === "advice_only") fails.push("wants advice only, not design with execution");
  if (f.location === "outside") fails.push("outside Pune and PCMC");
  if (f.timeline === "too_soon") fails.push("timeline is shorter than we can deliver");
  if (f.budget === "clearly_insufficient") fails.push("volunteered budget is clearly below the scope");

  if (fails.length > 0) {
    return { status: "declined", reason: fails.join("; ") + ".", flags: priorityFlags(f) };
  }

  // Unclear on the main checks: ask ONE direct question (first unclear item in this order).
  if (f.work === "unclear") return clarify("Are you looking for full design with execution, or design advice only?", "project scope");
  if (f.location === "unclear") return clarify("Which area is the property in?", "property location");
  if (f.property_type === "unclear") return clarify("Is the property a home or an office?", "property type");
  if (f.property_type === "office" && f.carpet_area_sqft === null) return clarify("What is the carpet area of the office?", "office size");
  if (f.timeline === "unclear") return clarify("When do you need the work to be complete?", "timeline");

  // Qualified. Unclear decision-maker or budget does not block (rules 4 and 5); we note it instead.
  if (f.decision_maker === "unclear") flags.push("decision_maker_unclear");
  // DEFAULT 4: asked for too soon, but a later start works -> qualified, with a flag.
  if (f.timeline === "can_start_later") flags.push("timeline_flexible_later_start");
  flags.push(...priorityFlags(f));

  return { status: "qualified", reason: "Fits our services, Pune/PCMC, design with execution, realistic timeline.", flags };
}

function priorityFlags(f: Facts): string[] {
  return f.earlier_enquiry_not_followed_up ? ["priority_recovery"] : [];
}

function clarify(question: string, what: string): Decision {
  return { status: "needs_clarification", reason: `Unclear: ${what}.`, question, flags: [] };
}
