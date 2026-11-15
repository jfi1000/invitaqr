-- Ejecutar como postgres después de crear event_staff / staff_invites
ALTER TABLE staff_invites OWNER TO invitaqr;
ALTER TABLE event_staff OWNER TO invitaqr;
GRANT ALL ON TABLE staff_invites TO invitaqr;
GRANT ALL ON TABLE event_staff TO invitaqr;
