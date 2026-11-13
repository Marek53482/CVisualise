/*
 * Generator PDF bez okna drukowania (telefony: iOS dopisuje do wydruku nagłówek i stopkę, których nie da się wyłączyć).
 *
 * Układ bierzemy z przeglądarki: kopia arkusza podglądu jest dzielona na kartki A4, a potem dla każdego znaku
 * odczytujemy jego położenie. Tekst trafia do PDF jako prawdziwy tekst (da się go zaznaczać, czytają go systemy ATS)
 * w kolejności czytania, zapisany osadzonymi czcionkami o tych samych szerokościach znaków co krój z podglądu.
 */

import { PDFDocument, PDFString, popGraphicsState, pushGraphicsState, rgb, setCharacterSpacing, setCharacterSqueeze, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import arimoRegular from '../assets/fonts/Arimo_400Regular.ttf?url';
import arimoBold from '../assets/fonts/Arimo_700Bold.ttf?url';
import arimoItalic from '../assets/fonts/Arimo_400Regular_Italic.ttf?url';
import arimoBoldItalic from '../assets/fonts/Arimo_700Bold_Italic.ttf?url';
import gelasioRegular from '../assets/fonts/Gelasio_400Regular.ttf?url';
import gelasioBold from '../assets/fonts/Gelasio_700Bold.ttf?url';
import gelasioItalic from '../assets/fonts/Gelasio_400Regular_Italic.ttf?url';
import gelasioBoldItalic from '../assets/fonts/Gelasio_700Bold_Italic.ttf?url';
import openSansRegular from '../assets/fonts/OpenSans_400Regular.ttf?url';
import openSansBold from '../assets/fonts/OpenSans_700Bold.ttf?url';
import openSansItalic from '../assets/fonts/OpenSans_400Regular_Italic.ttf?url';
import openSansBoldItalic from '../assets/fonts/OpenSans_700Bold_Italic.ttf?url';
import { getStyle, metaText, type CvDoc, type FontKey } from './format';
import { paginate } from './paginate';

const PAGE_MM = 297;
const PAGE_W_PT = 595.28;
const PAGE_H_PT = 841.89;
const PT_PER_MM = 72 / 25.4;
const PT_PER_PX = 0.75;

// Czcionki są przycięte do alfabetu łacińskiego (scripts/subset-fonts.sh), więc osadzamy je w całości.
// Arimo ma szerokości znaków jak Arial i Helvetica, Gelasio jak Georgia. Verdana nie ma wolnego odpowiednika
// o tych samych szerokościach - Open Sans jest jej najbliższy, a różnice wyrównuje odstęp między znakami.
type Variants = [regular: string, bold: string, italic: string, boldItalic: string];
const FONT_FILES: Record<FontKey, Variants> = {
  arial: [arimoRegular, arimoBold, arimoItalic, arimoBoldItalic],
  helvetica: [arimoRegular, arimoBold, arimoItalic, arimoBoldItalic],
  georgia: [gelasioRegular, gelasioBold, gelasioItalic, gelasioBoldItalic],
  verdana: [openSansRegular, openSansBold, openSansItalic, openSansBoldItalic],
};

const fontCache = new Map<string, Promise<ArrayBuffer>>();
function loadFont(url: string) {
  let bytes = fontCache.get(url);
  if (!bytes) {
    bytes = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Nie udało się wczytać czcionki (${r.status}).`);
      return r.arrayBuffer();
    });
    bytes.catch(() => fontCache.delete(url));
    fontCache.set(url, bytes);
  }
  return bytes;
}

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value: string): Color | null {
  const m = /rgba?\(([^)]+)\)/.exec(value);
  if (!m) return null;
  const [r, g, b, a = '1'] = m[1].split(/[\s,/]+/).filter(Boolean);
  return { r: Number(r) / 255, g: Number(g) / 255, b: Number(b) / 255, a: Number(a) };
}

const toRgb = (c: Color) => rgb(c.r, c.g, c.b);

interface Run {
  text: string;
  left: number;
  right: number;
  top: number;
}

/** Odcinki tekstu z jednego węzła, każdy w jednym wierszu, z położeniem w pikselach ekranu. */
function textRuns(node: Text, upper: boolean): Run[] {
  const runs: Run[] = [];
  const range = document.createRange();
  const text = node.data;
  let run: (Run & { lastSolid: number }) | null = null;
  const flush = () => {
    if (!run) return;
    const trimmed = run.text.replace(/\s+$/, '');
    if (trimmed) runs.push({ text: trimmed, left: run.left, right: run.lastSolid, top: run.top });
    run = null;
  };
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const r = range.getClientRects()[0];
    if (!r || r.width === 0) continue; // spacja zwinięta przez przeglądarkę
    let ch = /\s/.test(text[i]) ? ' ' : text[i];
    if (upper) ch = ch.toLocaleUpperCase('pl-PL');
    if (run && Math.abs(r.top - run.top) < 1 && r.left >= run.right - 1) {
      run.text += ch;
      run.right = r.right;
      if (ch !== ' ') run.lastSolid = r.right;
    } else {
      flush();
      if (ch === ' ') continue; // spacja na początku wiersza
      run = { text: ch, left: r.left, right: r.right, top: r.top, lastSolid: r.right };
    }
  }
  flush();
  range.detach?.();
  return runs;
}

/**
 * Tworzy PDF z arkusza podglądu.
 * @param source widoczny arkusz .cv-sheet (kopiowany, oryginał się nie zmienia)
 */
export async function createPdf(doc: CvDoc, source: HTMLElement): Promise<Blob> {
  const style = getStyle(doc.meta);
  const fontBytes = Promise.all(FONT_FILES[style.font].map(loadFont));

  // Kopia arkusza poza ekranem, bez powiększenia podglądu.
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;visibility:hidden;pointer-events:none;';
  const sheet = source.cloneNode(true) as HTMLElement;
  sheet.classList.remove('is-interactive');
  sheet.classList.add('is-export');
  sheet.querySelectorAll('.cv-page-marker').forEach((el) => el.remove());
  sheet.querySelectorAll('.cv-list:not(.cv-list--ordered) > li').forEach((li) => {
    const dot = document.createElement('span');
    dot.className = 'cv-x-bullet';
    li.prepend(dot);
  });
  sheet.querySelectorAll<HTMLOListElement>('ol.cv-list--ordered').forEach((ol) => {
    Array.from(ol.children).forEach((li, i) => {
      const num = document.createElement('span');
      num.className = 'cv-x-num';
      num.textContent = `${(ol.start || 1) + i}.`;
      li.prepend(num);
    });
  });
  host.append(sheet);
  document.body.append(host);

  try {
    await document.fonts?.ready;
    const { num } = style;
    paginate(sheet, num['margin-top'], num['margin-bottom']);

    const ruler = sheet.querySelector<HTMLElement>('.cv-ruler')!;
    const pxPerMm = ruler.getBoundingClientRect().height / 100;
    const origin = sheet.getBoundingClientRect();
    const mmX = (px: number) => (px - origin.left) / pxPerMm;
    const mmY = (px: number) => (px - origin.top) / pxPerMm;

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const [regular, bold, italic, boldItalic] = await Promise.all((await fontBytes).map((b) => pdf.embedFont(b)));
    const pages: PDFPage[] = [];
    const pageAt = (yMm: number) => {
      const index = Math.max(0, Math.floor(yMm / PAGE_MM));
      while (pages.length <= index) pages.push(pdf.addPage([PAGE_W_PT, PAGE_H_PT]));
      return { page: pages[index], offset: index * PAGE_MM };
    };
    pageAt(0);

    // Linia bazowa względem górnej krawędzi znaku zależy od kroju i rozmiaru - mierzymy ją raz dla każdego zestawu.
    const baselines = new Map<string, number>();
    const baselineOffset = (cs: CSSStyleDeclaration) => {
      const key = `${cs.fontStyle}|${cs.fontWeight}|${cs.fontSize}|${cs.fontFamily}`;
      let value = baselines.get(key);
      if (value === undefined) {
        const probe = document.createElement('span');
        Object.assign(probe.style, { fontStyle: cs.fontStyle, fontWeight: cs.fontWeight, fontSize: cs.fontSize, fontFamily: cs.fontFamily, lineHeight: cs.lineHeight });
        const text = document.createTextNode('H');
        const mark = document.createElement('span');
        mark.className = 'cv-x-probe';
        probe.append(text, mark);
        sheet.append(probe);
        const range = document.createRange();
        range.selectNodeContents(text);
        value = mark.getBoundingClientRect().top - range.getBoundingClientRect().top;
        probe.remove();
        baselines.set(key, value);
      }
      return value;
    };

    // 1. Tekst, w kolejności dokumentu.
    const walker = document.createTreeWalker(sheet.querySelector('.cv-content')!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const el = node.parentElement;
      if (!el || !node.data.trim()) continue;
      const cs = getComputedStyle(el);
      const color = parseColor(cs.color);
      if (!color || color.a === 0) continue;
      const weight = Number(cs.fontWeight) || 400;
      const isItalic = cs.fontStyle === 'italic' || cs.fontStyle.startsWith('oblique');
      const font: PDFFont = weight >= 600 ? (isItalic ? boldItalic : bold) : isItalic ? italic : regular;
      const sizePt = parseFloat(cs.fontSize) * PT_PER_PX;
      const ascent = baselineOffset(cs);
      const letterSpacing = (parseFloat(cs.letterSpacing) || 0) * PT_PER_PX;

      for (const run of textRuns(node, cs.textTransform === 'uppercase')) {
        const baselineMm = mmY(run.top + ascent);
        const { page, offset } = pageAt(mmY(run.top));
        const x = mmX(run.left) * PT_PER_MM;
        const y = PAGE_H_PT - (baselineMm - offset) * PT_PER_MM;
        // Szerokość odcinka dopasowana do ekranu: lekkie zwężenie lub poszerzenie znaków (dla czcionek o tych samych
        // szerokościach co krój z podglądu praktycznie zerowe), a resztę wyrównuje odstęp między znakami.
        const n = run.text.length;
        const target = ((run.right - run.left) / pxPerMm) * PT_PER_MM;
        const natural = font.widthOfTextAtSize(run.text, sizePt) + letterSpacing * n;
        const squeeze = Math.max(0.85, Math.min(1.2, target / natural));
        const spacing = letterSpacing + (target - natural * squeeze) / (n * squeeze);
        page.pushOperators(pushGraphicsState(), setCharacterSqueeze(squeeze * 100), setCharacterSpacing(spacing));
        page.drawText(run.text, { x, y, size: sizePt, font, color: toRgb(color) });
        page.pushOperators(popGraphicsState());
      }
    }

    // 2. Linie (obramowania) i punktory.
    const fillRect = (leftMm: number, topMm: number, widthMm: number, heightMm: number, color: Color) => {
      const { page, offset } = pageAt(topMm);
      page.drawRectangle({
        x: leftMm * PT_PER_MM,
        y: PAGE_H_PT - (topMm - offset + heightMm) * PT_PER_MM,
        width: widthMm * PT_PER_MM,
        height: heightMm * PT_PER_MM,
        color: toRgb(color),
        opacity: color.a,
      });
    };
    sheet.querySelectorAll<HTMLElement>('.cv-content *').forEach((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      if (el.classList.contains('cv-x-bullet')) {
        const color = parseColor(cs.backgroundColor);
        if (!color) return;
        const { page, offset } = pageAt(mmY(r.top));
        page.drawEllipse({
          x: mmX(r.left + r.width / 2) * PT_PER_MM,
          y: PAGE_H_PT - (mmY(r.top + r.height / 2) - offset) * PT_PER_MM,
          xScale: (r.width / 2 / pxPerMm) * PT_PER_MM,
          yScale: (r.height / 2 / pxPerMm) * PT_PER_MM,
          color: toRgb(color),
        });
        return;
      }
      const side = (width: string, styleName: string, colorValue: string) => {
        const w = parseFloat(width);
        const color = parseColor(colorValue);
        return w > 0 && styleName !== 'none' && styleName !== 'hidden' && color && color.a > 0 ? { w: w / pxPerMm, color } : null;
      };
      const top = side(cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor);
      const bottom = side(cs.borderBottomWidth, cs.borderBottomStyle, cs.borderBottomColor);
      const left = side(cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor);
      if (top) fillRect(mmX(r.left), mmY(r.top), r.width / pxPerMm, top.w, top.color);
      if (bottom) fillRect(mmX(r.left), mmY(r.bottom) - bottom.w, r.width / pxPerMm, bottom.w, bottom.color);
      if (left) fillRect(mmX(r.left), mmY(r.top), left.w, r.height / pxPerMm, left.color);
    });

    // 3. Klikalne odnośniki (e-mail, telefon, strona).
    sheet.querySelectorAll<HTMLAnchorElement>('.cv-content a[href]').forEach((a) => {
      for (const r of Array.from(a.getClientRects())) {
        const { page, offset } = pageAt(mmY(r.top));
        const x1 = mmX(r.left) * PT_PER_MM;
        const x2 = mmX(r.right) * PT_PER_MM;
        const y1 = PAGE_H_PT - (mmY(r.bottom) - offset) * PT_PER_MM;
        const y2 = PAGE_H_PT - (mmY(r.top) - offset) * PT_PER_MM;
        const link = pdf.context.register(
          pdf.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [x1, y1, x2, y2],
            Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of(a.href) },
          }),
        );
        page.node.addAnnot(link);
      }
    });

    const name = doc.name.trim();
    const role = metaText(doc.meta, 'role');
    pdf.setTitle(role ? `${name} - ${role}` : name || 'CV', { showInWindowTitleBar: true });
    if (name) pdf.setAuthor(name);
    pdf.setCreator('CVisualise');
    pdf.setProducer('CVisualise');

    const bytes = await pdf.save();
    return new Blob([bytes as BlobPart], { type: 'application/pdf' });
  } finally {
    host.remove();
  }
}
