import type { ReactNode } from 'react';
import type { SectionKind } from './format';

/* Formatowanie w linii: **pogrubienie**, *kursywa*, `kod`, [link](https://…). HTML zawsze jako tekst. */

const TOKEN = /(`[^`\n]+`)|\[([^\]\n]+)\]\(([^\s)]+)\)|\*\*([^\n]+?)\*\*|\*([^*\n]+)\*/g;

export function safeUrl(value: string): string | null {
  const s = value.trim();
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(s) || /[\u0000- <>"']/.test(s)) return null;
  try {
    new URL(s);
    return s;
  } catch {
    return null;
  }
}

/** Adres strony wpisany bez protokołu (np. github.com/jan) zamienia na link https. */
export function websiteHref(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return safeUrl(/^[a-z]+:/i.test(v) ? v : `https://${v}`);
}

function renderLine(text: string, key: string, depth: number): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(TOKEN.source, 'g');
  let last = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}.${n++}`;
    const nested = (s: string) => (depth < 4 ? renderLine(s, k, depth + 1) : s);
    if (m[1]) {
      out.push(<code key={k}>{m[1].slice(1, -1)}</code>);
    } else if (m[2] !== undefined) {
      const href = safeUrl(m[3]);
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer">
            {nested(m[2])}
          </a>
        ) : (
          m[0]
        ),
      );
    } else if (m[4] !== undefined) {
      out.push(<strong key={k}>{nested(m[4])}</strong>);
    } else {
      out.push(<em key={k}>{nested(m[5])}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderInline(text: string, key = 'i'): ReactNode[] {
  const lines = text.split('\n');
  return lines.flatMap((line, i) => {
    const nodes = renderLine(line, `${key}-${i}`, 0);
    return i < lines.length - 1 ? [...nodes, <br key={`${key}-br${i}`} />] : nodes;
  });
}

/** Automatyczne wyróżnienie etykiet: „Sieci: …” w umiejętnościach, „Angielski: …” w językach. */
export function autoLabels(text: string, kind: SectionKind): string {
  if (kind === 'skills') {
    return text.replace(/^([^:*[\]<>`\n]{2,70}):(?=\s|$)/, (all, label: string) =>
      /(https?|mailto|tel)$/i.test(label) ? all : `**${label}:**`,
    );
  }
  if (kind === 'languages') {
    return text.replace(/(^|\.\s+|\n)(\p{Lu}[\p{L} /-]{1,35}):(?=\s|$)/gu, '$1**$2:**');
  }
  return text;
}
