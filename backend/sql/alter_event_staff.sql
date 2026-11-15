-- Staff invitations + assignment to events
-- Prefer staff_invites (creable por el rol de app) sobre columnas en users.

CREATE TABLE IF NOT EXISTS staff_invites (
  staff_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  invite_token         UUID NOT NULL UNIQUE,
  invite_token_expiry  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS event_staff (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_event_staff_event ON event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_staff ON event_staff(staff_id);

-- La app corre como rol invitaqr; sin esto verás 500 "permiso denegado".
ALTER TABLE staff_invites OWNER TO invitaqr;
ALTER TABLE event_staff OWNER TO invitaqr;
GRANT ALL ON TABLE staff_invites TO invitaqr;
GRANT ALL ON TABLE event_staff TO invitaqr;

-- Opcional (requiere dueño de users, p.ej. rol postgres):
-- ALTER TABLE users
--   ADD COLUMN IF NOT EXISTS invite_token UUID,
--   ADD COLUMN IF NOT EXISTS invite_token_expiry TIMESTAMPTZ;
