import {
  detailCard,
  escapeHtml,
  firstName,
  renderEmail,
} from './email-layout';

export interface RsvpConfirmedTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
  venueName: string | null;
  location: string | null;
  companions: number;
  qrDataUrl: string | null;
}

export function rsvpConfirmedTemplate(input: RsvpConfirmedTemplateInput): string {
  const name = firstName(input.guestName);
  const place = [input.venueName?.trim(), input.location?.trim()]
    .filter(Boolean)
    .join(' · ');
  const rows = [
    { label: 'Evento', value: input.eventName },
    { label: 'Cuándo', value: input.when },
    { label: 'Dónde', value: place },
    {
      label: 'Acompañantes',
      value: input.companions > 0 ? String(input.companions) : '',
    },
  ];

  const qr = input.qrDataUrl
    ? `
      <div style="margin:24px auto 0;padding:18px;max-width:280px;background:#f7f6fb;border:1px solid #e6e2f2;border-radius:20px;text-align:center;">
        <img src="${input.qrDataUrl}" alt="Código QR de acceso" width="220"
          style="display:block;width:220px;height:auto;margin:0 auto;" />
        <p style="margin:14px 0 0;font-size:14px;color:#6b6b6b;line-height:1.45;">
          Este es tu pase. Muéstralo en la entrada y guárdalo a la mano.
        </p>
      </div>`
    : `<p style="margin:18px 0 0;text-align:center;color:#6b6b6b;">
         Tu lugar ya está asegurado. El código QR llegará cuando esté listo.
       </p>`;

  const body = `
    <p style="margin:0;text-align:center;font-size:17px;line-height:1.55;">
      ¡Listo, <strong>${escapeHtml(name)}</strong>!
    </p>
    <p style="margin:14px 0 0;text-align:center;font-size:17px;line-height:1.55;">
      Tu lugar en <strong>${escapeHtml(input.eventName)}</strong> quedó confirmado.
      Ya eres parte de la lista.
    </p>
    ${detailCard(rows)}
    ${qr}
  `;

  return renderEmail({
    preheader: `Confirmado: tu lugar en ${input.eventName} está listo.`,
    eyebrow: 'Confirmación',
    title: '¡Tu lugar está listo!',
    bodyHtml: body,
  });
}
