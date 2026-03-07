-- migration_v9: add payment_history JSONB array to monthly_snapshots
-- Replaces the single fee_payment_ref text field for multi-payment audit trail.
-- fee_payment_ref is kept for backward compatibility (stores last payment ref).
-- payment_history stores all payments: [{amount, method, ref, paid_at}]

ALTER TABLE monthly_snapshots
  ADD COLUMN IF NOT EXISTS payment_history jsonb DEFAULT '[]'::jsonb;
