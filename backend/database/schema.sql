-- Patient Management System - PostgreSQL schema
-- Mirrors the TypeORM entities (the API can also create this itself with DB_SYNC=true).
-- Upgrading an existing database? Apply database/migrations/*.sql in order instead.

CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Paid', 'Failed', 'Cancelled');

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    clinic_name    VARCHAR(120),
    password       VARCHAR(255) NOT NULL,              -- bcrypt hash
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Every patient belongs to one account (clinic); all API queries are scoped by user_id.
CREATE TABLE patients (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER      REFERENCES users (id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    age          SMALLINT     NOT NULL CHECK (age BETWEEN 0 AND 150),
    gender       gender_enum  NOT NULL,
    blood_group  VARCHAR(3)   CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    phone        VARCHAR(20)  NOT NULL,
    email        VARCHAR(150) NOT NULL,
    address      TEXT         NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_patients_owner_email" UNIQUE (user_id, email)
);
CREATE INDEX idx_patients_user_id ON patients (user_id);
CREATE INDEX idx_patients_name    ON patients (name);
CREATE INDEX idx_patients_gender  ON patients (gender);

CREATE TABLE bills (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER             NOT NULL REFERENCES patients (id) ON DELETE RESTRICT,
    description     TEXT                NOT NULL,
    amount          NUMERIC(12, 2)      NOT NULL CHECK (amount > 0),
    tax             NUMERIC(12, 2)      NOT NULL DEFAULT 0 CHECK (tax >= 0),
    total_amount    NUMERIC(12, 2)      NOT NULL CHECK (total_amount = amount + tax),
    due_date        DATE,
    payment_status  payment_status_enum NOT NULL DEFAULT 'Pending',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);
CREATE INDEX idx_bills_patient_id     ON bills (patient_id);
CREATE INDEX idx_bills_payment_status ON bills (payment_status);
CREATE INDEX idx_bills_due_date       ON bills (due_date);

CREATE TABLE payments (
    id                   SERIAL PRIMARY KEY,
    bill_id              INTEGER             NOT NULL REFERENCES bills (id) ON DELETE CASCADE,
    razorpay_order_id    VARCHAR(64)         NOT NULL UNIQUE,
    razorpay_payment_id  VARCHAR(64)         UNIQUE,
    razorpay_signature   VARCHAR(255),
    amount               NUMERIC(12, 2)      NOT NULL CHECK (amount > 0),
    currency             VARCHAR(3)          NOT NULL DEFAULT 'INR',
    payment_status       payment_status_enum NOT NULL DEFAULT 'Pending',
    failure_reason       VARCHAR(255),
    created_at           TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ         NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_bill_id ON payments (bill_id);

-- Keep updated_at fresh on direct SQL updates too (TypeORM also sets it from the app).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bills_updated_at    BEFORE UPDATE ON bills    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
