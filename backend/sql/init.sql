CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- USUARIOS (OWNER | PLANNER | STAFF)
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL CHECK (role IN ('OWNER','PLANNER','STAFF')),
  is_active     BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- EVENTOS
-- ─────────────────────────────────────────────
CREATE TABLE events (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                UUID          NOT NULL REFERENCES users(id),
  name                    VARCHAR(200)  NOT NULL,
  description             TEXT,
  location                VARCHAR(300),
  starts_at               TIMESTAMPTZ   NOT NULL,
  ends_at                 TIMESTAMPTZ   NOT NULL,
  capacity                INT           NOT NULL DEFAULT 100,
  rsvp_deadline           TIMESTAMPTZ,
  plan                    VARCHAR(20)   DEFAULT 'FREE' CHECK (plan IN ('FREE','BASIC','PRO')),
  status                  VARCHAR(20)   DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT','ACTIVE','CLOSED','CANCELLED')),
  type                    VARCHAR(30)   NOT NULL DEFAULT 'social'
                          CHECK (type IN ('social','corporate','educational','entertainment')),
  has_tables              BOOLEAN       NOT NULL DEFAULT FALSE,
  table_count             INT,
  default_max_companions  INT           NOT NULL DEFAULT 0,
  has_zones               BOOLEAN       NOT NULL DEFAULT FALSE,
  zones                   TEXT,
  logo                    TEXT,
  created_at              TIMESTAMPTZ   DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INVITADOS
-- ─────────────────────────────────────────────
CREATE TABLE guests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name           VARCHAR(150) NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(255),
  max_companions INT          NOT NULL DEFAULT 0,
  table_number   INT,
  zone           VARCHAR(100),
  notes          TEXT,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PASES (RSVP + QR)
-- ─────────────────────────────────────────────
CREATE TABLE passes (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id             UUID        NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id             UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rsvp_token           UUID        NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  qr_token             TEXT        UNIQUE,
  rsvp_status          VARCHAR(20) DEFAULT 'PENDING'
                       CHECK (rsvp_status IN ('PENDING','CONFIRMED','DECLINED','WAITLIST')),
  companions_confirmed INT         DEFAULT 0,
  accessed_at          TIMESTAMPTZ,
  access_status        VARCHAR(20) DEFAULT 'NOT_ACCESSED'
                       CHECK (access_status IN ('NOT_ACCESSED','ACCESSED','REJECTED')),
  rsvp_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LOG DE ESCANEOS (inmutable, audit trail)
-- ─────────────────────────────────────────────
CREATE TABLE scan_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_id        UUID        REFERENCES passes(id),
  event_id       UUID        NOT NULL REFERENCES events(id),
  scanner_id     UUID        REFERENCES users(id),
  raw_token      TEXT,
  result         VARCHAR(30) NOT NULL
                 CHECK (result IN (
                   'OK','ALREADY_USED','INVALID_TOKEN',
                   'EXPIRED','WRONG_EVENT','EVENT_INACTIVE',
                   'OUT_OF_SCHEDULE','NOT_CONFIRMED'
                 )),
  scanned_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PAGOS (Stripe)
-- ─────────────────────────────────────────────
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID         NOT NULL REFERENCES events(id),
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_id VARCHAR(255),
  plan              VARCHAR(20)  NOT NULL CHECK (plan IN ('BASIC','PRO')),
  amount            INT          NOT NULL,  -- centavos MXN
  currency          VARCHAR(10)  DEFAULT 'MXN',
  status            VARCHAR(20)  DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────
CREATE INDEX idx_events_owner        ON events(owner_id);
CREATE INDEX idx_guests_event        ON guests(event_id);
CREATE INDEX idx_passes_guest        ON passes(guest_id);
CREATE INDEX idx_passes_event        ON passes(event_id);
CREATE INDEX idx_passes_rsvp_token   ON passes(rsvp_token);
CREATE INDEX idx_scan_logs_event     ON scan_logs(event_id);
CREATE INDEX idx_scan_logs_pass      ON scan_logs(pass_id);
CREATE INDEX idx_payments_event      ON payments(event_id);
