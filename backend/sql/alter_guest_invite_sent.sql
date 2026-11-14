-- Estado de envío de invitación (tabla guests; invitaqr es dueño)
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;
