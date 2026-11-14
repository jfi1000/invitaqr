export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const INDIGO = '#4334d6';
const PAPER = '#f7f6fb';
const CARD = '#ffffff';
const INK = '#12101a';
const MUTE = '#6b6b6b';
const LINE = '#e6e2f2';

/** Marca InvitaQR (cuadrícula estilo app) sin imágenes externas. */
export function brandMarkHtml(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="width:56px;height:56px;background:${INDIGO};border-radius:16px;padding:11px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:14px;height:14px;background:#ffffff;border-radius:3px;"></td>
              <td style="width:6px;"></td>
              <td style="width:14px;height:14px;background:#ffffff;border-radius:3px;opacity:0.85;"></td>
            </tr>
            <tr><td colspan="3" style="height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="width:14px;height:14px;background:#ffffff;border-radius:3px;opacity:0.85;"></td>
              <td style="width:6px;"></td>
              <td align="right" style="padding-top:4px;">
                <div style="width:8px;height:8px;background:#ffffff;border-radius:2px;margin-left:auto;"></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

export function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

export interface RenderEmailOptions {
  preheader?: string;
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
}

export function renderEmail(options: RenderEmailOptions | string, bodyHtml?: string): string {
  const opts: RenderEmailOptions =
    typeof options === 'string'
      ? { title: options, bodyHtml: bodyHtml ?? '' }
      : options;

  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHtml(opts.preheader)}
      </div>`
    : '';

  const eyebrow = opts.eyebrow
    ? `<tr>
         <td style="padding-top:18px;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${INDIGO};">
           ${escapeHtml(opts.eyebrow)}
         </td>
       </tr>`
    : '';

  const footer =
    opts.footerNote ??
    'Enviado con InvitaQR · Si no esperabas este mensaje, puedes ignorarlo.';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK};font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${CARD};border:1px solid ${LINE};border-radius:28px;overflow:hidden;">
          <tr>
            <td style="height:6px;background:${INDIGO};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;">
              ${brandMarkHtml()}
              <div style="margin-top:14px;font-size:13px;font-weight:700;letter-spacing:0.18em;color:${INDIGO};">INVITAQR</div>
            </td>
          </tr>
          ${eyebrow}
          <tr>
            <td style="padding:8px 28px 0;font-size:28px;line-height:1.2;font-weight:700;color:${INK};text-align:center;">
              ${escapeHtml(opts.title)}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 8px;font-size:16px;line-height:1.55;color:${INK};">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;font-size:12px;line-height:1.5;color:${MUTE};text-align:center;border-top:1px solid ${LINE};">
              ${escapeHtml(footer)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px;">
      <tr>
        <td align="center" style="background:${INDIGO};border-radius:999px;">
          <a href="${escapeHtml(href)}"
             style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function detailCard(rows: Array<{ label: string; value: string }>): string {
  const items = rows
    .filter((row) => row.value.trim())
    .map(
      (row) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTE};">
            ${escapeHtml(row.label)}
          </div>
          <div style="margin-top:4px;font-size:16px;font-weight:600;color:${INK};">
            ${escapeHtml(row.value)}
          </div>
        </td>
      </tr>`,
    )
    .join('');

  if (!items) {
    return '';
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin:22px 0 0;background:${PAPER};border:1px solid ${LINE};border-radius:18px;padding:4px 16px;">
      ${items}
    </table>`;
}
