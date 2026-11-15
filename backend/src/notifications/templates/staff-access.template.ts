import { escapeHtml, firstName, renderEmail } from './email-layout';

export function staffAccessTemplate(input: {
  staffName: string;
  eventName: string;
  loginUrl: string;
}): string {
  const name = escapeHtml(firstName(input.staffName));
  const eventName = escapeHtml(input.eventName);
  const url = escapeHtml(input.loginUrl);

  return renderEmail({
    preheader: `Entra a escanear ${input.eventName}`,
    eyebrow: 'Personal de acceso',
    title: `${name}, ya puedes escanear`,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#12101a;">
        Tu acceso para <strong>${eventName}</strong> está listo.
      </p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#12101a;">
        Entra con tu correo y contraseña para abrir el escáner en puerta.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
        <tr>
          <td style="border-radius:14px;background:#4334d6;">
            <a href="${url}"
               style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">
              Ir a escanear
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b6b6b;">
        Si olvidaste tu contraseña, pide al organizador que te reenvíe la invitación.
      </p>
    `,
    footerNote: 'InvitaQR · acceso en puerta',
  });
}
