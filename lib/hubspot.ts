// Creates a deal (and a contact) in HubSpot for a qualified enquiry. Does nothing if no token is set.
const BASE = "https://api.hubapi.com";

export const hubspotConfigured = () => !!process.env.HUBSPOT_ACCESS_TOKEN;

async function hs(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot ${method} ${path} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function createDeal(input: { name: string | null; phone: string | null; summaryLine: string }): Promise<string> {
  // First stage of the default deals pipeline.
  const pipelines = await hs("GET", "/crm/v3/pipelines/deals");
  const pipeline = pipelines.results.find((p: any) => p.id === "default") ?? pipelines.results[0];
  const stage = [...pipeline.stages].sort((a: any, b: any) => a.displayOrder - b.displayOrder)[0];

  const contact = await hs("POST", "/crm/v3/objects/contacts", {
    properties: { firstname: input.name ?? "Unknown caller", ...(input.phone ? { phone: input.phone } : {}) },
  });
  const deal = await hs("POST", "/crm/v3/objects/deals", {
    properties: { dealname: `Aangan enquiry: ${input.name ?? "Unknown caller"}`, pipeline: pipeline.id, dealstage: stage.id, description: input.summaryLine },
    associations: [{ to: { id: contact.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] }],
  });
  return String(deal.id);
}
