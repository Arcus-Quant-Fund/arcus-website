-- ============================================================
-- Migration v10: client_applications table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS client_applications (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name             TEXT        NOT NULL,
  email                 TEXT        NOT NULL,
  phone                 TEXT,
  country               TEXT        NOT NULL,
  starting_capital      TEXT        NOT NULL,
  binance_uid           TEXT,
  api_key               TEXT,
  -- NOTE: api_secret is NEVER stored — sent to admin via email only
  agreed_nda            BOOLEAN     NOT NULL DEFAULT FALSE,
  agreed_participation  BOOLEAN     NOT NULL DEFAULT FALSE,
  agreed_risk           BOOLEAN     NOT NULL DEFAULT FALSE,
  agreed_at             TIMESTAMPTZ,
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'reviewing', 'active', 'declined', 'cancelled')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_applications_email  ON client_applications(email);
CREATE INDEX IF NOT EXISTS idx_client_applications_status ON client_applications(status);
CREATE INDEX IF NOT EXISTS idx_client_applications_created ON client_applications(created_at DESC);

-- RLS: only service role can read/write (no public access)
ALTER TABLE client_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON client_applications
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE client_applications IS
  'Client self-service signup applications. api_secret is NEVER stored here — emailed to admin only.';
