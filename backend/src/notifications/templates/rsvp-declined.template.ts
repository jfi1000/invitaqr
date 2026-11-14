import { escapeHtml, firstName, renderEmail } from './email-layout';

export interface RsvpDeclinedTemplateInput {
  guestName: string;
  eventName: string;
}

export function rsvpDeclinedTemplate(input: RsvpDeclinedTemplateInput): string {
  const name = firstName(input.guestName);
  const body = `
    <p style="margin:0;text-align:center;font-size:17px;line-height:1.55;">
      Hola <strong>${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:14px 0 0;text-align:center;font-size:17px;line-height:1.55;">
      Registramos que no podrás acompañarnos en
      <strong>${escapeHtml(input.eventName)}</strong>.
      Gracias por avisar: eso ayuda mucho a organizar el día.
    </p>
    <p style="margin:18px 0 0;text-align:center;font-size:15px;color:#6b6b6b;line-height:1.5;">
      Si los planes cambian, escribe a quien te invitó. Siempre hay espacio para una buena noticia.
    </p>
  `;

  return renderEmail({
    preheader: `Recibimos tu respuesta sobre ${input.eventName}.`,
    eyebrow: 'Respuesta recibida',
    title: 'Gracias por avisarnos',
    bodyHtml: body,
  });
}
