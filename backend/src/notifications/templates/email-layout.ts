export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3efe6;color:#1c1915;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;padding:20px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;padding:28px 22px;">
          <tr>
            <td style="font-size:14px;font-weight:800;letter-spacing:0.12em;color:#8a7d6b;">INVITAQR</td>
          </tr>
          <tr>
            <td style="padding-top:14px;font-size:34px;line-height:1.12;font-weight:800;">${escapeHtml(title)}</td>
          </tr>
          <tr>
            <td style="padding-top:18px;font-size:20px;line-height:1.45;">${bodyHtml}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:22px;padding:18px 24px;background:#161616;color:#ffffff;font-size:22px;font-weight:800;line-height:1.2;text-decoration:none;border-radius:14px;">${escapeHtml(label)}</a>`;
}
