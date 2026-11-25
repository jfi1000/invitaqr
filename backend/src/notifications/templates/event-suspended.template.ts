import { escapeHtml, firstName, renderEmail } from './email-layout';

export interface EventSuspendedTemplateInput {
  guestName: string;
  eventName: string;
}

export function eventSuspendedTemplate(
  input: EventSuspendedTemplateInput,
): string {
  const name = firstName(input.guestName);
  const body = `
    <p style="margin:0;text-align:center;font-size:17px;line-height:1.55;">
      Hola <strong>${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:14px 0 0;text-align:center;font-size:17px;line-height:1.55;">
      <strong>${escapeHtml(input.eventName)}</strong> quedó suspendido de forma temporal.
    </p>
    <p style="margin:18px 0 0;text-align:center;font-size:15px;color:#6b6b6b;line-height:1.5;">
      Te avisaremos cuando el evento se reactive. Hasta entonces no hace falta que uses tu pase.
    </p>
  `;

  return renderEmail({
    preheader: `${input.eventName} está suspendido temporalmente.`,
    eyebrow: 'Aviso del evento',
    title: 'Evento suspendido',
    bodyHtml: body,
  });
}
