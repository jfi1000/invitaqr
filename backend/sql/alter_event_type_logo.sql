-- Extiende eventos e invitados para tipo, logo, mesas y zonas.
-- Corre una vez sobre la base existente.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'social',
  ADD COLUMN IF NOT EXISTS has_tables BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS table_count INT,
  ADD COLUMN IF NOT EXISTS default_max_companions INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_zones BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS zones TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_type_check'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_type_check
      CHECK (type IN ('social', 'corporate', 'educational', 'entertainment'));
  END IF;
END $$;

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS table_number INT,
  ADD COLUMN IF NOT EXISTS zone VARCHAR(100);
