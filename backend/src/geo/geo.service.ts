import { Injectable } from '@nestjs/common';

export interface GeoHit {
  latitude: number;
  longitude: number;
  label: string;
  approximate: boolean;
  queryUsed: string;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

const STATE_EXPAND: Record<string, string> = {
  ver: 'Veracruz',
  veracruz: 'Veracruz',
  cdmx: 'Ciudad de México',
  df: 'Ciudad de México',
  mex: 'Estado de México',
  nl: 'Nuevo León',
  jal: 'Jalisco',
  gto: 'Guanajuato',
  qro: 'Querétaro',
  mor: 'Morelos',
  pue: 'Puebla',
  oax: 'Oaxaca',
  chis: 'Chiapas',
  tab: 'Tabasco',
  camp: 'Campeche',
  yuc: 'Yucatán',
  qroo: 'Quintana Roo',
  bc: 'Baja California',
  bcs: 'Baja California Sur',
  sin: 'Sinaloa',
  son: 'Sonora',
  chih: 'Chihuahua',
  coah: 'Coahuila',
  dgo: 'Durango',
  zac: 'Zacatecas',
  slp: 'San Luis Potosí',
  ags: 'Aguascalientes',
  mic: 'Michoacán',
  gro: 'Guerrero',
  tamps: 'Tamaulipas',
  hgo: 'Hidalgo',
  tlax: 'Tlaxcala',
  nay: 'Nayarit',
  col: 'Colima',
};

@Injectable()
export class GeoService {
  async search(input: {
    q?: string;
    address?: string;
    venue?: string;
  }): Promise<GeoHit | null> {
    const queries = this.buildQueries(input);
    for (let i = 0; i < queries.length; i += 1) {
      const hit = await this.nominatim(queries[i]);
      if (hit) {
        return {
          ...hit,
          approximate: i > 0,
          queryUsed: queries[i],
        };
      }
      // Nominatim: max 1 req/s
      await delay(1100);
    }
    return null;
  }

  private buildQueries(input: {
    q?: string;
    address?: string;
    venue?: string;
  }): string[] {
    const out: string[] = [];
    const push = (raw?: string) => {
      if (!raw?.trim()) return;
      for (const variant of this.variants(raw)) {
        if (!out.includes(variant)) out.push(variant);
      }
    };

    push(input.address);
    push(input.q);
    if (input.venue && input.address) {
      push(`${input.venue}, ${input.address}`);
    }
    if (input.address?.includes(',')) {
      const tail = input.address.split(',').slice(-2).join(',').trim();
      push(tail);
    }
    push(input.venue);
    return out;
  }

  private variants(raw: string): string[] {
    const cleaned = raw
      .replace(
        /\b(ext(erior)?|int(erior)?|apto\.?|depto\.?|departamento|no\.?|núm(ero)?\.?|#)\s*\.?\s*\d+[a-zA-Z]?\b/gi,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim();

    const expanded = this.expandAbbreviations(cleaned);
    const parts = expanded
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    const list: string[] = [];
    const push = (value: string) => {
      const t = value.trim();
      if (t && !list.includes(t)) list.push(t);
    };

    // 1) dirección completa (sin ext/int)
    push(expanded);
    // 2) ciudad + estado pronto — evita caer en CDMX si la calle no está en OSM
    if (parts.length >= 2) {
      push(`${parts.slice(-2).join(', ')}, México`);
    }
    if (parts.length >= 3) {
      push(`${parts.slice(-3).join(', ')}, México`);
    }
    const cityLike = parts.find((part) =>
      /xalapa|veracruz|méxico|mexico|puebla|guadalajara|monterrey|oaxaca/i.test(
        part,
      ),
    );
    if (cityLike) push(`${cityLike}, México`);

    return list;
  }

  private expandAbbreviations(text: string): string {
    return text
      .split(',')
      .map((part) => {
        const trimmed = part.trim();
        const key = trimmed
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{M}/gu, '');
        return STATE_EXPAND[key] ?? trimmed;
      })
      .join(', ');
  }

  private async nominatim(query: string): Promise<Omit<
    GeoHit,
    'approximate' | 'queryUsed'
  > | null> {
    const url = `${NOMINATIM}?format=json&limit=1&countrycodes=mx&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'InvitaQR/1.0 (event venue geocoder; contact@invitaqr.local)',
      },
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;
    const hit = rows[0];
    if (!hit) return null;
    return {
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
      label: hit.display_name ?? query,
    };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
