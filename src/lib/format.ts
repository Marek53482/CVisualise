/*
 * CVisualise — format pliku CV (.md).
 * Ograniczony Markdown z blokiem ustawień na początku. Zgodny wstecz z formatem „cv-studio: 1”.
 */

export const FORMAT_VERSION = 1;

export type MetaValue = string | number;
export type CvMeta = Record<string, MetaValue>;

export interface CvSection {
  title: string;
  body: string;
}

export interface CvDoc {
  meta: CvMeta;
  name: string;
  intro: string;
  sections: CvSection[];
}

export interface ParseResult {
  doc: CvDoc;
  warnings: string[];
}

export class CvParseError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(message);
    this.name = 'CvParseError';
    this.line = line;
  }
}

export const FONTS = {
  arial: { label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif' },
  helvetica: { label: 'Helvetica', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  verdana: { label: 'Verdana', stack: 'Verdana, Geneva, "DejaVu Sans", sans-serif' },
  georgia: { label: 'Georgia', stack: 'Georgia, "Times New Roman", Times, serif' },
} as const;
export type FontKey = keyof typeof FONTS;
export const DEFAULT_FONT: FontKey = 'arial';

export const NUMERIC = {
  'font-size': { label: 'Wielkość tekstu', unit: 'pt', min: 9, max: 12, step: 0.5, def: 10 },
  'line-height': { label: 'Interlinia', unit: '', min: 1.15, max: 1.65, step: 0.01, def: 1.34 },
  'section-gap': { label: 'Odstęp nad sekcją', unit: 'px', min: 6, max: 22, step: 1, def: 18 },
  'margin-x': { label: 'Margines boczny', unit: 'mm', min: 8, max: 24, step: 1, def: 14 },
  'margin-top': { label: 'Margines górny', unit: 'mm', min: 6, max: 24, step: 1, def: 9 },
  'margin-bottom': { label: 'Margines dolny', unit: 'mm', min: 6, max: 24, step: 1, def: 12 },
} as const;
export type NumericKey = keyof typeof NUMERIC;
export const NUMERIC_KEYS = Object.keys(NUMERIC) as NumericKey[];

export const TEXT_KEYS = ['role', 'email', 'phone', 'location', 'website'] as const;
export type TextKey = (typeof TEXT_KEYS)[number];

export const DEFAULT_ACCENT = '#173247';

const VERSION_KEY = 'cvisualise';
const LEGACY_VERSION_KEY = 'cv-studio';
const KEY_ORDER: string[] = [VERSION_KEY, ...TEXT_KEYS, 'font', ...NUMERIC_KEYS, 'accent'];

export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

export function defaultMeta(): CvMeta {
  const meta: CvMeta = { [VERSION_KEY]: FORMAT_VERSION };
  for (const key of TEXT_KEYS) meta[key] = '';
  meta.font = DEFAULT_FONT;
  for (const key of NUMERIC_KEYS) meta[key] = NUMERIC[key].def;
  meta.accent = DEFAULT_ACCENT;
  return meta;
}

export interface CvStyle {
  font: FontKey;
  accent: string;
  num: Record<NumericKey, number>;
}

export function getStyle(meta: CvMeta): CvStyle {
  const font = String(meta.font ?? DEFAULT_FONT) as FontKey;
  const num = {} as Record<NumericKey, number>;
  for (const key of NUMERIC_KEYS) {
    const n = Number(meta[key]);
    num[key] = Number.isFinite(n) ? n : NUMERIC[key].def;
  }
  const accent = String(meta.accent ?? DEFAULT_ACCENT);
  return {
    font: font in FONTS ? font : DEFAULT_FONT,
    accent: /^#[0-9a-f]{6}$/i.test(accent) ? accent : DEFAULT_ACCENT,
    num,
  };
}

export function metaText(meta: CvMeta, key: TextKey): string {
  const v = meta[key];
  return v === undefined ? '' : String(v).trim();
}

function parseValue(raw: string, line: number): MetaValue {
  if (raw.startsWith('"')) {
    try {
      const v: unknown = JSON.parse(raw);
      if (typeof v === 'string') return v;
    } catch {
      /* zgłoszone niżej */
    }
    throw new CvParseError('Niepoprawny cudzysłów w ustawieniach. Tekst zapisuj jako "wartość", a cudzysłów w środku jako \\".', line);
  }
  if (/^'.*'$/.test(raw)) return raw.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function round(n: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(n.toFixed(decimals));
}

function normalizeMeta(raw: CvMeta, warnings: string[]): CvMeta {
  const meta = defaultMeta();
  const version = raw[VERSION_KEY] ?? raw[LEGACY_VERSION_KEY];
  if (version !== undefined && Number(version) > FORMAT_VERSION) {
    warnings.push('Plik zapisano w nowszej wersji formatu — część ustawień może zostać pominięta.');
  }

  for (const [key, value] of Object.entries(raw)) {
    if (key === VERSION_KEY || key === LEGACY_VERSION_KEY) continue;

    if ((TEXT_KEYS as readonly string[]).includes(key)) {
      meta[key] = String(value).trim();
    } else if (key === 'font') {
      const font = String(value).trim().toLowerCase();
      if (font in FONTS) meta.font = font;
      else warnings.push(`Nieznany krój pisma „${value}” — użyto Arial. Dostępne: ${Object.keys(FONTS).join(', ')}.`);
    } else if (key in NUMERIC) {
      const spec = NUMERIC[key as NumericKey];
      const n = Number(value);
      if (!Number.isFinite(n)) {
        warnings.push(`Ustawienie „${key}” musi być liczbą — użyto wartości domyślnej ${spec.def}.`);
      } else if (n < spec.min || n > spec.max) {
        const clamped = Math.min(spec.max, Math.max(spec.min, n));
        warnings.push(`Ustawienie „${key}” (${n}) jest poza zakresem ${spec.min}–${spec.max} — użyto ${clamped}.`);
        meta[key] = round(clamped, spec.step);
      } else {
        meta[key] = n;
      }
    } else if (key === 'accent') {
      let color = String(value).trim();
      if (/^#[0-9a-f]{3}$/i.test(color)) color = '#' + [...color.slice(1)].map((c) => c + c).join('');
      if (/^#[0-9a-f]{6}$/i.test(color)) meta.accent = color.toLowerCase();
      else warnings.push(`Kolor „${value}” ma niepoprawny format (np. #173247) — użyto domyślnego.`);
    } else {
      // Nieznane ustawienia zachowujemy przy zapisie.
      meta[key] = value;
    }
  }
  return meta;
}

function trimBlankLines(lines: string[]): string {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start++;
  while (end > start && !lines[end - 1].trim()) end--;
  return lines
    .slice(start, end)
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n');
}

export function parseCv(source: string): ParseResult {
  const text = String(source).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (text.length > 300_000) throw new CvParseError('Plik jest za duży (maksymalnie 300 000 znaków).');

  const lines = text.split('\n');
  const warnings: string[] = [];
  const rawMeta: CvMeta = {};
  let start = 0;

  let first = 0;
  while (first < lines.length && !lines[first].trim()) first++;
  if (lines[first]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > first && l.trim() === '---');
    if (end < 0) throw new CvParseError('Brakuje zamykającej linii --- w bloku ustawień na początku pliku.', first + 1);
    const seen = new Set<string>();
    for (let i = first + 1; i < end; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      const m = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
      if (!m) throw new CvParseError(`Niepoprawne ustawienie „${line}”. Oczekiwano zapisu klucz: "wartość".`, i + 1);
      const key = m[1].toLowerCase();
      if (seen.has(key)) warnings.push(`Ustawienie „${key}” wystąpiło kilka razy — użyto ostatniej wartości.`);
      seen.add(key);
      rawMeta[key] = parseValue(m[2].trim(), i + 1);
    }
    start = end + 1;
  }

  const doc: CvDoc = { meta: normalizeMeta(rawMeta, warnings), name: '', intro: '', sections: [] };
  const intro: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let nameFound = false;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const h1 = /^#[ \t]+(.*)$/.exec(line) ?? (/^#$/.test(line.trim()) ? ['#', ''] : null);
    if (h1) {
      if (!nameFound && !current) {
        doc.name = h1[1].trim();
        nameFound = true;
        continue;
      }
      warnings.push(`Wiersz ${i + 1}: kolejny nagłówek „# …” potraktowano jako sekcję. Sekcje zaczynaj od „## ”.`);
      current = { title: h1[1].trim(), lines: [] };
      sections.push(current);
      continue;
    }
    const h2 = /^##[ \t]+(.*)$/.exec(line) ?? (/^##$/.test(line.trim()) ? ['##', ''] : null);
    if (h2) {
      current = { title: h2[1].trim(), lines: [] };
      sections.push(current);
      continue;
    }
    (current ? current.lines : intro).push(line);
  }

  doc.intro = trimBlankLines(intro);
  doc.sections = sections.map((s) => ({ title: s.title, body: trimBlankLines(s.lines) }));
  if (!nameFound) warnings.push('Brakuje nagłówka „# Imię i nazwisko”.');
  return { doc, warnings };
}

function formatValue(value: MetaValue): string {
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

export function serializeCv(doc: CvDoc): string {
  const meta: CvMeta = { ...defaultMeta(), ...doc.meta, [VERSION_KEY]: FORMAT_VERSION };
  delete meta[LEGACY_VERSION_KEY];
  const keys = [...KEY_ORDER, ...Object.keys(meta).filter((k) => !KEY_ORDER.includes(k))];
  const out: string[] = ['---', ...keys.filter((k) => meta[k] !== undefined).map((k) => `${k}: ${formatValue(meta[k])}`), '---', ''];

  out.push(`# ${doc.name.trim()}`, '');
  if (doc.intro.trim()) out.push(doc.intro.trim(), '');
  for (const section of doc.sections) {
    out.push(`## ${section.title.trim()}`, '');
    if (section.body.trim()) out.push(section.body.trim(), '');
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

/* ---------- Rodzaje sekcji ---------- */

export type SectionKind = 'profile' | 'experience' | 'skills' | 'languages' | 'footer' | 'standard';

export function sectionKind(title: string): SectionKind {
  const t = title.trim().toLowerCase();
  if (/^(profil(?: zawodowy)?|profile|professional (?:profile|summary)|summary|o mnie|about me)$/.test(t)) return 'profile';
  if (/^(klauzula(?: rodo)?|zgoda|rodo|privacy statement|consent|gdpr)$/.test(t)) return 'footer';
  if (/^(doświadczenie|doswiadczenie|(?:work |professional )?experience|employment|historia zatrudnienia)/.test(t)) return 'experience';
  if (/^(języki|jezyki|languages)(?:\s|$)/.test(t)) return 'languages';
  if (/^(umiejętności|umiejetnosci|skills|kompetencje|narzędzia|tools|technologie)/.test(t)) return 'skills';
  return 'standard';
}

export const KIND_HINT: Partial<Record<SectionKind, string>> = {
  profile: 'Bez nagłówka — tekst tuż pod danymi kontaktowymi',
  footer: 'Stopka — mała czcionka, bez nagłówka',
  experience: 'Ciaśniejsze punkty',
  languages: 'Tekst o 10% mniejszy',
  skills: 'Etykiety przed dwukropkiem są pogrubiane',
};

/* ---------- Nazwy plików ---------- */

const PL_MAP: Record<string, string> = { ł: 'l', Ł: 'L' };

export function slugifyFilePart(text: string): string {
  return text
    .replace(/[łŁ]/g, (c) => PL_MAP[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

export function suggestedBaseName(doc: CvDoc): string {
  const parts = [slugifyFilePart(doc.name), 'CV', slugifyFilePart(metaText(doc.meta, 'role'))].filter(Boolean);
  return parts.length > 1 ? parts.join('_') : 'CV';
}
