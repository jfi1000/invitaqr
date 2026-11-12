import { escapeHtml, renderEmail } from './email-layout';

export interface RsvpConfirmedTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
  location: string | null;
  companions: number;
  qrDataUrl: string | null;
}

export function rsvpConfirmedTemplate(input: RsvpConfirmedTemplateInput): string {
  const place = input.location
    ? `<p style="margin:12px 0 0;">Lugar: <strong>${escapeHtml(input.location)}</strong></p>`
    : '';
  const companions =
    input.companions > 0
      ? `<p style="margin:12px 0 0;">Acompañantes confirmados: <strong>${input.companions}</strong></p>`
      : '';
  const qr = input.qrDataUrl
    ? `<img src="${input.qrDataUrl}" alt="Código QR de acceso" width="280" style="display:block;width:100%;max-width:280px;height:auto;margin:22px auto 0;" />
       <p style="margin:12px 0 0;">Muestra este código en la entrada. No lo compartas.</p>`
    : `<p style="margin:16px 0 0;">Tu lugar está confirmado. El código QR se enviará cuando esté listo.</p>`;

  const body = `
    <p style="margin:0;">Hola ${escapeHtml(input.guestName)}.</p>
    <p style="margin:16px 0 0;">Tu asistencia a <strong>${escapeHtml(input.eventName)}</strong> quedó confirmada.</p>
    <p style="margin:12px 0 0;">Fecha: <strong>${escapeHtml(input.when)}</strong></p>
    ${place}
    ${companions}
    ${qr}
  `;

  return renderEmail('Acceso confirmado', body);
}
