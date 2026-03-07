-- ============================================================
-- Migration v11: provisioning fields for client_applications
-- Run in Supabase SQL Editor AFTER migration_v10
-- ============================================================

ALTER TABLE client_applications
  ADD COLUMN IF NOT EXISTS api_secret_enc  TEXT,
  ADD COLUMN IF NOT EXISTS bot_id          TEXT,
  ADD COLUMN IF NOT EXISTS client_uuid     UUID;

-- Index for provisioning poll
CREATE INDEX IF NOT EXISTS idx_client_applications_provisioning
  ON client_applications(status)
  WHERE status IN ('provisioning', 'api_validated');

COMMENT ON COLUMN client_applications.api_secret_enc IS
  'AES-256-CBC encrypted API secret (IV:ciphertext hex). Zeroed out after bot provisioning.';
COMMENT ON COLUMN client_applications.bot_id IS
  'Assigned bot slot (e.g. c1, c2). Set during admin approval.';
COMMENT ON COLUMN client_applications.client_uuid IS
  'Supabase Auth user UUID. Set during admin approval.';
