// Reads numbers for the dashboard straight from Neon. Nothing here is estimated: a missing value stays null.
import { sql } from "./db";

export async function getStats() {
  const db = sql();
  const [t] = await db.query(`
    SELECT
      count(*)::int                                                    AS total,
      count(*) FILTER (WHERE after_hours)::int                         AS after_hours,
      count(*) FILTER (WHERE status = 'qualified')::int                AS qualified,
      count(*) FILTER (WHERE status = 'declined')::int                 AS declined,
      count(*) FILTER (WHERE status = 'needs_clarification')::int      AS needs_clarification,
      count(*) FILTER (WHERE status = 'escalate')::int                 AS escalate,
      count(*) FILTER (WHERE handoff_status = 'sent')::int             AS handoff_sent,
      count(*) FILTER (WHERE handoff_status = 'failed')::int           AS handoff_failed,
      count(*) FILTER (WHERE consultation_at IS NOT NULL)::int         AS booked,
      count(*) FILTER (WHERE hubspot_deal_id IS NOT NULL)::int         AS deals,
      count(*) FILTER (WHERE price_asked)::int                         AS price_asked,
      count(duration_seconds)::int                                     AS with_duration,
      sum(duration_seconds)::float                                     AS total_seconds,
      count(cost_credits)::int                                         AS with_cost,
      sum(cost_credits)::float                                         AS total_cost_credits,
      sum(openai_tokens)::int                                          AS openai_tokens
    FROM calls`);
  const recent = await db.query(`
    SELECT id, received_at, caller_name, caller_phone, status, reason, flags, after_hours, duration_seconds,
           consultation_at, hubspot_deal_id, handoff_status
    FROM calls ORDER BY received_at DESC LIMIT 25`);
  return { t, recent };
}
