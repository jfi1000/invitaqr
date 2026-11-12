import { escapeHtml, renderEmail } from './email-layout';

export interface RsvpDeclinedTemplateInput {
  guestName: string;
  eventName: string;
}

export function rsvpDeclinedTemplate(input: RsvpDeclinedTemplateInput): string {
  const body = `
    <p style="margin:0;">Hola ${escapeHtml(input.guestName)}.</p>
    <p style="margin:16px 0 0;">Recibimos tu respuesta: no asistirás a <strong>${escapeHtml(input.eventName)}</strong>.</p>
    <p style="margin:16px 0 0;">Guardamos tu respuesta. Gracias por avisar.</p>
  `;

  return renderEmail('Respuesta registrada', body);
}
