-- 002: self-service accounts, per-account data isolation, bill due dates, patient profile fields.
-- Safe to run once on a database created from the original schema.sql. Run inside a transaction.
BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS clinic_name   VARCHAR(120),
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS user_id     INTEGER REFERENCES users (id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS blood_group VARCHAR(3),
    ADD COLUMN IF NOT EXISTS notes       TEXT;

-- Existing patients belong to the first (seeded admin) account.
UPDATE patients SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL;

-- Patient email is unique per clinic, not globally.
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_email_key;
ALTER TABLE patients ADD CONSTRAINT "UQ_patients_owner_email" UNIQUE (user_id, email);
ALTER TABLE patients ADD CONSTRAINT patients_blood_group_check
    CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients (user_id);

ALTER TABLE bills ADD COLUMN IF NOT EXISTS due_date DATE;
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills (due_date);

COMMIT;
