import {
  detailCard,
  emailButton,
  escapeHtml,
  firstName,
  renderEmail,
} from './email-layout';

export interface RsvpInviteTemplateInput {
  guestName: string;
  eventName: string;
  when: string;
  venueName: string | null;
  location: string | null;
  rsvpUrl: string;
}

export function rsvpInviteTemplate(input: RsvpInviteTemplateInput): string {
  const name = firstName(input.guestName);
  const place = [input.venueName?.trim(), input.location?.trim()]
    .filter(Boolean)
    .join(' · ');
  const rows = [
    { label: 'Cuándo', value: input.when },
    { label: 'Dónde', value: place || 'Te lo confirmamos pronto' },
  ];

  const body = `
    <p style="margin:0;text-align:center;font-size:17px;line-height:1.55;">
      Hola <strong>${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:14px 0 0;text-align:center;font-size:17px;line-height:1.55;">
      Hay un lugar guardado con tu nombre en
      <strong>${escapeHtml(input.eventName)}</strong>.
      Nos encantaría que fueras parte de ese día.
    </p>
    ${detailCard(rows)}
    <p style="margin:22px 0 0;text-align:center;font-size:15px;line-height:1.5;color:#6b6b6b;">
      Toca el botón, elige si vas (y con quién) y listo.
      Tu enlace es personal: solo funciona para ti.
    </p>
    ${emailButton(input.rsvpUrl, 'Ver mi invitación')}
    <p style="margin:8px 0 0;text-align:center;font-size:13px;color:#6b6b6b;">
      ¿No puedes ir? También puedes avisarnos desde el mismo enlace.
    </p>
  `;

  return renderEmail({
    preheader: `${name}, te esperan en ${input.eventName}. Confirma tu lugar en un toque.`,
    eyebrow: 'Tu pase digital',
    title: 'Te están esperando',
    bodyHtml: body,
    footerNote:
      'InvitaQR · Este correo es una invitación personal. Si no la reconoces, ignóralo con tranquilidad.',
  });
}
