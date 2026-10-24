
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,

  user_id INTEGER NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  subject VARCHAR(998) NOT NULL,
  body TEXT NOT NULL,

  start_at TIMESTAMPTZ NOT NULL,
  delay_seconds INTEGER NOT NULL DEFAULT 0,
  hourly_limit INTEGER,

  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (
      status IN (
        'draft',
        'scheduled',
        'processing',
        'completed',
        'cancelled',
        'failed'
      )
    ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_delay
    CHECK (delay_seconds >= 0),

  CONSTRAINT valid_hourly_limit
    CHECK (hourly_limit IS NULL OR hourly_limit > 0)
);
