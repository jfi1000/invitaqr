import { escapeHtml, renderEmail } from './email-layout';

export interface WaitlistTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
}

export function waitlistTemplate(input: WaitlistTemplateInput): string {
  const body = `
    <p style="margin:0;">Hola ${escapeHtml(input.guestName)}.</p>
    <p style="margin:16px 0 0;">Por ahora no hay lugar en <strong>${escapeHtml(input.eventName)}</strong>. Quedaste en lista de espera.</p>
    <p style="margin:12px 0 0;">Fecha del evento: <strong>${escapeHtml(input.when)}</strong></p>
    <p style="margin:16px 0 0;">Si se libera un lugar, te escribimos con tu código de acceso.</p>
  `;

  return renderEmail('Lista de espera', body);
}
