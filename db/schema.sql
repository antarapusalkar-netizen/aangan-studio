-- One table. One row per phone/web call. Run this once in the Neon SQL Editor.
CREATE TABLE IF NOT EXISTS calls (
  id              SERIAL PRIMARY KEY,
  vaani_call_id   TEXT UNIQUE NOT NULL,   -- Vaani id, stops duplicate webhook deliveries
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  after_hours     BOOLEAN,                -- called outside 10am-7pm IST

  caller_name     TEXT,
  caller_phone    TEXT,                   -- NULL if Vaani did not send it
  transcript      TEXT,
  summary         TEXT,

  duration_seconds NUMERIC,               -- NULL if Vaani did not send it
  cost_credits     NUMERIC,               -- Vaani credits, NULL until fetched, not assumed to be rupees
  openai_tokens    INTEGER,

  facts           JSONB,                  -- what OpenAI extracted from the call
  status          TEXT,                   -- qualified | declined | needs_clarification | escalate
  reason          TEXT,                   -- one plain sentence
  flags           TEXT[] DEFAULT '{}',    -- e.g. decision_maker_unclear, priority_recovery

  price_asked     BOOLEAN,
  consultation_at TIMESTAMPTZ,            -- NULL if nothing was booked
  cal_booking_id  TEXT,
  hubspot_deal_id TEXT,
  handoff_status  TEXT NOT NULL DEFAULT 'not_needed',  -- not_needed | sent | failed
  handoff_error   TEXT
);

CREATE INDEX IF NOT EXISTS calls_received_at_idx ON calls (received_at DESC);
