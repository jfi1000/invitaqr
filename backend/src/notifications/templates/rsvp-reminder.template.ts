import {
  detailCard,
  escapeHtml,
  firstName,
  renderEmail,
} from './email-layout';

export interface RsvpReminderTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
  venueName: string | null;
  location: string | null;
  qrDataUrl: string | null;
}

export function rsvpReminderTemplate(input: RsvpReminderTemplateInput): string {
  const name = firstName(input.guestName);
  const place = [input.venueName?.trim(), input.location?.trim()]
    .filter(Boolean)
    .join(' · ');
  const rows = [
    { label: 'Cuándo', value: input.when },
    { label: 'Dónde', value: place },
  ];
  const qr = input.qrDataUrl
    ? `
      <div style="margin:24px auto 0;padding:18px;max-width:280px;background:#f7f6fb;border:1px solid #e6e2f2;border-radius:20px;text-align:center;">
        <img src="${input.qrDataUrl}" alt="Código QR de acceso" width="220"
          style="display:block;width:220px;height:auto;margin:0 auto;" />
        <p style="margin:14px 0 0;font-size:14px;color:#6b6b6b;">
          Lleva este código. Es el mismo de tu confirmación.
        </p>
      </div>`
    : `<p style="margin:18px 0 0;text-align:center;color:#6b6b6b;">
         Lleva el código QR que recibiste al confirmar.
       </p>`;

  const body = `
    <p style="margin:0;text-align:center;font-size:17px;line-height:1.55;">
      <strong>${escapeHtml(name)}</strong>, se acerca el gran momento.
    </p>
    <p style="margin:14px 0 0;text-align:center;font-size:17px;line-height:1.55;">
      <strong>${escapeHtml(input.eventName)}</strong> es en las próximas 24 horas.
      Prepara tu pase y nos vemos allá.
    </p>
    ${detailCard(rows)}
    ${qr}
  `;

  return renderEmail({
    preheader: `${input.eventName} es pronto. Ten tu QR a la mano.`,
    eyebrow: 'Recordatorio',
    title: 'Mañana es el día',
    bodyHtml: body,
  });
}
