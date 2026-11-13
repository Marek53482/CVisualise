import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { getStyle, NUMERIC, PAGE_HEIGHT_MM, type CvDoc, type NumericKey } from '../lib/format';
import { CvDocument, styleVars, type SelectTarget } from './CvDocument';
import { IconCheck, IconFit, IconWarn } from './Icons';

export type FitOutcome = { status: 'already' } | { status: 'fitted'; num: Record<NumericKey, number> } | { status: 'impossible' };

interface Props {
  doc: CvDoc;
  stale: boolean;
  /** Telefon: podgląd zawsze na szerokość ekranu, bez przycisków powiększenia. */
  compact?: boolean;
  onSelect: (target: SelectTarget) => void;
  fitRef: MutableRefObject<(() => FitOutcome) | null>;
  onFit: () => void;
}

const SHEET_WIDTH_PX = (210 / 25.4) * 96;
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5];

// Kolejność zmniejszania: odstępy i marginesy, a dopiero potem czcionka. Najpierw z umiarkowanymi
// limitami (CV pozostaje przewiewne), a jeśli to nie wystarczy — z twardymi minimami.
type Floors = Record<'section-gap' | 'line-height' | 'margin-top' | 'margin-bottom' | 'margin-x', number>;
const FLOORS: Floors[] = [
  { 'section-gap': 13, 'line-height': 1.26, 'margin-top': 8, 'margin-bottom': 9, 'margin-x': 12 },
  { 'section-gap': 10, 'line-height': 1.2, 'margin-top': 7, 'margin-bottom': 8, 'margin-x': 10 },
];
const SHRINK: [keyof Floors, number][] = [
  ['section-gap', -1],
  ['line-height', -0.02],
  ['margin-top', -1],
  ['margin-bottom', -1],
  ['section-gap', -1],
  ['line-height', -0.02],
  ['margin-x', -1],
];

export function Preview({ doc, stale, compact = false, onSelect, fitRef, onFit }: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [fill, setFill] = useState(0);
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit');
  const [fitZoom, setFitZoom] = useState(1);
  const style = getStyle(doc.meta);
  const { num } = style;

  const contentMm = useCallback(() => {
    const content = contentRef.current;
    const ruler = rulerRef.current;
    if (!content || !ruler || !ruler.offsetHeight) return 0;
    return content.offsetHeight / (ruler.offsetHeight / 100);
  }, []);

  const measure = useCallback(() => {
    const mm = contentMm();
    const available = PAGE_HEIGHT_MM - num['margin-top'] - num['margin-bottom'];
    setPages(Math.max(1, Math.ceil((mm - 0.5) / available)));
    setFill(mm / available);
  }, [contentMm, num]);

  useLayoutEffect(measure);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(content);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const gutter = compact ? 24 : 56;
    const ro = new ResizeObserver(() => setFitZoom(Math.min(1.35, Math.max(0.3, (el.clientWidth - gutter) / SHEET_WIDTH_PX))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  // Dopasowanie do jednej strony: próbne ustawienia są nakładane bezpośrednio na arkusz i mierzone.
  fitRef.current = () => {
    const sheet = sheetRef.current;
    if (!sheet) return { status: 'impossible' };
    const original = { ...num };
    const n = { ...num };
    const apply = (values: Record<NumericKey, number>) => {
      for (const [k, v] of Object.entries(styleVars({ ...style, num: values }))) sheet.style.setProperty(k, v);
    };
    const fits = () => {
      apply(n);
      return contentMm() <= PAGE_HEIGHT_MM - n['margin-top'] - n['margin-bottom'] - 0.5;
    };
    const done = (outcome: FitOutcome) => {
      apply(original);
      return outcome;
    };

    if (fits()) return done({ status: 'already' });
    for (const floors of FLOORS) {
      for (let fs = original['font-size']; fs >= NUMERIC['font-size'].min - 1e-9; fs = Number((fs - 0.5).toFixed(2))) {
        Object.assign(n, original, { 'font-size': fs });
        if (fits()) return done({ status: 'fitted', num: { ...n } });
        for (let round = 0; round < 30; round++) {
          let moved = false;
          for (const [key, delta] of SHRINK) {
            if (n[key] + delta < floors[key] - 1e-9) continue;
            n[key] = Number((n[key] + delta).toFixed(2));
            moved = true;
            if (fits()) return done({ status: 'fitted', num: { ...n } });
          }
          if (!moved) break;
        }
      }
    }
    return done({ status: 'impossible' });
  };

  const zoom = zoomMode === 'fit' || compact ? fitZoom : zoomMode;
  const percent = Math.round(fill * 100);

  return (
    <section className="preview" data-tour="preview">
      <div className="preview-bar no-print">
        <div className={`page-status${pages > 1 ? ' is-over' : ''}`}>
          {pages > 1 ? <IconWarn /> : <IconCheck />}
          <span>
            {pages === 1 ? '1 strona A4' : `${pages} strony A4`}
            <span className="muted"> · {pages === 1 ? `wypełnienie ${percent}%` : `treść na ${(fill).toFixed(2).replace('.', ',')} strony`}</span>
          </span>
          {pages > 1 && (
            <button className="btn btn-sm" onClick={onFit}>
              <IconFit /> Dopasuj do 1 strony
            </button>
          )}
        </div>
        {!compact && (
        <div className="zoom">
          <button className={zoomMode === 'fit' ? 'is-active' : ''} onClick={() => setZoomMode('fit')}>
            Dopasuj
          </button>
          {ZOOMS.map((z) => (
            <button key={z} className={zoomMode === z ? 'is-active' : ''} onClick={() => setZoomMode(z)}>
              {Math.round(z * 100)}%
            </button>
          ))}
        </div>
        )}
      </div>
      <div className="preview-scroll" ref={scrollRef}>
        {stale && (
          <div className="stale-banner no-print">
            <IconWarn /> Plik zawiera błąd — pokazuję ostatnią poprawną wersję.
          </div>
        )}
        <div className="sheet-zoom" style={{ zoom }}>
          <CvDocument doc={doc} pages={pages} onSelect={onSelect} sheetRef={sheetRef} contentRef={contentRef} rulerRef={rulerRef} />
        </div>
      </div>
    </section>
  );
}
