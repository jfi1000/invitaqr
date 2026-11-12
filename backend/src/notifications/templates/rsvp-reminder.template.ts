import { escapeHtml, renderEmail } from './email-layout';

export interface RsvpReminderTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
  location: string | null;
  qrDataUrl: string | null;
}

export function rsvpReminderTemplate(input: RsvpReminderTemplateInput): string {
  const place = input.location
    ? `<p style="margin:12px 0 0;">Lugar: <strong>${escapeHtml(input.location)}</strong></p>`
    : '';
  const qr = input.qrDataUrl
    ? `<img src="${input.qrDataUrl}" alt="Código QR de acceso" width="280" style="display:block;width:100%;max-width:280px;height:auto;margin:22px auto 0;" />
       <p style="margin:12px 0 0;">Lleva este código. Es el mismo de tu confirmación.</p>`
    : `<p style="margin:16px 0 0;">Lleva el código QR que recibiste al confirmar.</p>`;

  const body = `
    <p style="margin:0;">Hola ${escapeHtml(input.guestName)}.</p>
    <p style="margin:16px 0 0;"><strong>${escapeHtml(input.eventName)}</strong> es en las próximas 24 horas.</p>
    <p style="margin:12px 0 0;">Fecha: <strong>${escapeHtml(input.when)}</strong></p>
    ${place}
    ${qr}
  `;

  return renderEmail(`Mañana: ${input.eventName}`, body);
}
