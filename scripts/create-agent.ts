// Run: npm run agent:create
// Creates the Vaani agent (or updates it if it already exists) and saves VAANI_AGENT_ID in .env.local.
import { appendFileSync, readFileSync } from "node:fs";
import { SYSTEM_PROMPT, GREETING } from "../agent/system-prompt";

const BASE = "https://api.vaanivoice.ai";
const NAME = "Aangan Studio Front Desk";
const key = process.env.VAANI_API_KEY;
if (!key) { console.error("VAANI_API_KEY is missing in .env.local"); process.exit(1); }

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "X-API-Key": key!, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const agents = await call("GET", "/api/agents");
  let agent = (Array.isArray(agents) ? agents : agents.data ?? []).find((a: any) => a.display_name === NAME);
  let id: string;
  if (agent) { id = agent.id; console.log("Agent already exists:", id); }
  else {
    const created = await call("POST", "/api/create-agent", { agent_display_name: NAME });
    id = created.agent_id; console.log("Created agent:", id);
  }

  await call("PATCH", `/api/agent/${id}/persona`, {
    identity: {
      system_prompt: SYSTEM_PROMPT,
      greeting_message: { agent_message: GREETING, agent_speech_delay: 1, interruptible: true, let_user_speak_first: false },
    },
    senses_capabilities: {
      language: "en",
      ears: { stt: { primary: { provider: "deepgram", model: "nova-3", language: "en", keywords: ["Aangan", "PCMC", "Pimpri", "Baner", "Kothrud", "Hinjewadi"] } } },
      brain: { llm: { primary: { provider: "openai", model: "gpt-4o", parameters: { temperature: 0.3, max_tokens: 400 } } } },
      // Voice taken from Vaani's own docs example (Cartesia "devansh"). Change it in the dashboard Voice Lab if you prefer another.
      mouth: { tts: { primary: { provider: "cartesia", model: "sonic-3-2025-10-27", voice_id: "1259b7e3-cb8a-43df-9446-30971a46b8b0", voice_name: "devansh", config: { speed: 1, language: "en" } } } },
    },
  });
  console.log("Persona saved (prompt, greeting, voice, language).");

  if (!/^VAANI_AGENT_ID=/m.test(readFileSync(".env.local", "utf8"))) appendFileSync(".env.local", `VAANI_AGENT_ID=${id}\n`);
  console.log("VAANI_AGENT_ID saved in .env.local");
}
main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
