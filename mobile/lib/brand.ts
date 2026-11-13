export const DEFAULT_EVENT_LOGO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="48" fill="#4334d6"/>
      <rect x="52" y="52" width="52" height="52" rx="10" fill="#fff"/>
      <rect x="136" y="52" width="52" height="52" rx="10" fill="#fff" opacity="0.85"/>
      <rect x="52" y="136" width="52" height="52" rx="10" fill="#fff" opacity="0.85"/>
      <rect x="148" y="148" width="28" height="28" rx="6" fill="#fff"/>
      <text x="120" y="220" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">INVITAQR</text>
    </svg>`,
  )

export function eventLogo(logo: string | null | undefined): string {
  return logo && logo.trim() ? logo : DEFAULT_EVENT_LOGO
}
