import {
  detailCard,
  escapeHtml,
  firstName,
  renderEmail,
} from './email-layout';

export interface WaitlistTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
}

export function waitlistTemplate(input: WaitlistTemplateInput): string {
  const name = firstName(input.guestName);
  const body = `
    <p style="margin:0;text-align:center;font-size:17px;line-height:1.55;">
      Hola <strong>${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:14px 0 0;text-align:center;font-size:17px;line-height:1.55;">
      <strong>${escapeHtml(input.eventName)}</strong> se llenó rapidísimo,
      pero no te perdemos de vista: quedaste en lista de espera.
    </p>
    ${detailCard([{ label: 'Fecha del evento', value: input.when }])}
    <p style="margin:18px 0 0;text-align:center;font-size:15px;color:#6b6b6b;line-height:1.5;">
      Si se libera un lugar, te escribimos al instante con tu pase listo.
    </p>
  `;

  return renderEmail({
    preheader: `Estás en lista de espera para ${input.eventName}.`,
    eyebrow: 'Lista de espera',
    title: 'Casi, casi…',
    bodyHtml: body,
  });
}
