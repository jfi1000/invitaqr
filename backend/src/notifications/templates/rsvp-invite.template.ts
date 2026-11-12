import { emailButton, escapeHtml, renderEmail } from './email-layout';

export interface RsvpInviteTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
  location: string | null;
  rsvpUrl: string;
}

export function rsvpInviteTemplate(input: RsvpInviteTemplateInput): string {
  const place = input.location
    ? `<p style="margin:12px 0 0;">Lugar: <strong>${escapeHtml(input.location)}</strong></p>`
    : '';

  const body = `
    <p style="margin:0;">Hola ${escapeHtml(input.guestName)}.</p>
    <p style="margin:16px 0 0;">Te invitaron a <strong>${escapeHtml(input.eventName)}</strong>.</p>
    <p style="margin:12px 0 0;">Fecha: <strong>${escapeHtml(input.when)}</strong></p>
    ${place}
    <p style="margin:16px 0 0;">Confirma o declina con el botón. El enlace es solo tuyo.</p>
    ${emailButton(input.rsvpUrl, 'Responder invitación')}
  `;

  return renderEmail(`Invitación a ${input.eventName}`, body);
}
