import { escapeHtml, firstName, renderEmail } from './email-layout';

export function staffInviteTemplate(input: {
  staffName: string;
  eventName: string;
  activateUrl: string;
  loginUrl: string;
}): string {
  const name = escapeHtml(firstName(input.staffName));
  const eventName = escapeHtml(input.eventName);
  const url = escapeHtml(input.activateUrl);
  const loginUrl = escapeHtml(input.loginUrl);

  return renderEmail({
    preheader: `Activa tu acceso para ${input.eventName}`,
    eyebrow: 'Personal de acceso',
    title: `${name}, te invitaron a escanear`,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#12101a;">
        Fuiste invitado como personal de acceso en
        <strong>${eventName}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#12101a;">
        Primero activa tu cuenta y elige tu contraseña. Después entra al escáner con el mismo correo.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
        <tr>
          <td style="border-radius:14px;background:#4334d6;">
            <a href="${url}"
               style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">
              Activar cuenta
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#12101a;text-align:center;">
        ¿Ya activaste? Entra aquí:
      </p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.5;text-align:center;">
        <a href="${loginUrl}" style="color:#4334d6;font-weight:700;text-decoration:none;">
          Abrir app de escaneo
        </a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b6b6b;">
        El enlace de activación expira en 48 horas. Si no pediste acceso, ignora este correo.
      </p>
    `,
    footerNote: 'InvitaQR · acceso en puerta',
  });
}
