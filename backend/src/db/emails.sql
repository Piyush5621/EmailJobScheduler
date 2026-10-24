
CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,

  campaign_id INTEGER NOT NULL
    REFERENCES campaigns(id)
    ON DELETE CASCADE,

  recipient_id INTEGER NOT NULL
    REFERENCES recipients(id)
    ON DELETE CASCADE,

  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (
      status IN (
        'scheduled',
        'queued',
        'sending',
        'sent',
        'failed',
        'cancelled'
      )
    ),

  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_campaign_recipient
    UNIQUE (campaign_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_emails_campaign_id
  ON emails(campaign_id);

CREATE INDEX IF NOT EXISTS idx_emails_recipient_id
  ON emails(recipient_id);

CREATE INDEX IF NOT EXISTS idx_emails_status_scheduled_at
  ON emails(status, scheduled_at);
