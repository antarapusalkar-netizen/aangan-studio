// The ONLY allowed answer when a caller asks about price. From pricing.md.
// The agent must never say any figure, range, rate or per-square-foot amount.
export const PRICING_REPLY =
  "Pricing depends on the site, the materials you choose, and the scope. Your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like.";

// Used by tests and by a safety check on transcripts: did the agent say something that looks like a price?
export function agentQuotedPrice(agentLines: string[]): boolean {
  const looksLikePrice = /(₹|rs\.?\s?\d|inr\s?\d|\d+\s?(lakh|lac|crore|k\b)|per\s?(sq|square)|\/\s?sq|rates? (start|are)|it('ll| will) cost|around \d|approximately \d)/i;
  return agentLines.some((l) => looksLikePrice.test(l));
}
