import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IconClose } from './Icons';

export type Placement = 'bottom' | 'top' | 'right' | 'left';

export interface TourStep {
  /** Wartość atrybutu data-tour wskazywanego elementu. */
  target: string;
  title: string;
  body: ReactNode;
  placement: Placement;
  /** Przygotowanie widoku przed pokazaniem kroku (np. przełączenie zakładki). */
  before?: () => void;
  /** Jak przewinąć element do widoku. */
  scroll?: ScrollLogicalPosition;
}

interface Props {
  steps: TourStep[];
  onClose: () => void;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const GAP = 14;
const EDGE = 10;

function findTarget(step: TourStep): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
}

/** Obszar wyróżnienia: element z marginesem, przycięty do widocznej części okna. */
function spotlightBox(el: HTMLElement): Box | null {
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  const top = Math.max(EDGE / 2, r.top - PAD);
  const left = Math.max(EDGE / 2, r.left - PAD);
  const bottom = Math.min(window.innerHeight - EDGE / 2, r.bottom + PAD);
  const right = Math.min(window.innerWidth - EDGE / 2, r.right + PAD);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

const ORDER: Record<Placement, Placement[]> = {
  bottom: ['bottom', 'top', 'right', 'left'],
  top: ['top', 'bottom', 'right', 'left'],
  right: ['right', 'left', 'bottom', 'top'],
  left: ['left', 'right', 'bottom', 'top'],
};

function position(target: Box | null, size: { w: number; h: number }, preferred: Placement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vw - size.w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vh - size.h - EDGE);

  if (!target) return { top: clampY((vh - size.h) / 2), left: clampX((vw - size.w) / 2), placement: null, arrow: 0 };

  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  for (const p of ORDER[preferred]) {
    if (p === 'bottom' && target.top + target.height + GAP + size.h <= vh - EDGE) {
      const left = clampX(cx - size.w / 2);
      return { top: target.top + target.height + GAP, left, placement: p, arrow: cx - left };
    }
    if (p === 'top' && target.top - GAP - size.h >= EDGE) {
      const left = clampX(cx - size.w / 2);
      return { top: target.top - GAP - size.h, left, placement: p, arrow: cx - left };
    }
    if (p === 'right' && target.left + target.width + GAP + size.w <= vw - EDGE) {
      const top = clampY(Math.min(cy, target.top + 140) - size.h / 2);
      return { top, left: target.left + target.width + GAP, placement: p, arrow: Math.min(cy, target.top + 140) - top };
    }
    if (p === 'left' && target.left - GAP - size.w >= EDGE) {
      const top = clampY(Math.min(cy, target.top + 140) - size.h / 2);
      return { top, left: target.left - GAP - size.w, placement: p, arrow: Math.min(cy, target.top + 140) - top };
    }
  }
  return { top: clampY((vh - size.h) / 2), left: clampX((vw - size.w) / 2), placement: null, arrow: 0 };
}

export function Tour({ steps, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // Animacja przejścia między krokami dopiero po pierwszym ustawieniu wyróżnienia (bez „wjazdu” z rogu ekranu).
  const [animate, setAnimate] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  // Przygotowanie kroku: zmiana widoku, przewinięcie elementu.
  useEffect(() => {
    step.before?.();
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        findTarget(step)?.scrollIntoView({ block: step.scroll ?? 'nearest', inline: 'nearest' });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  // Śledzenie położenia wskazanego elementu (przewijanie, zmiana rozmiaru, zmiana treści).
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const el = findTarget(step);
      const next = el ? spotlightBox(el) : null;
      setBox((prev) => (sameBox(prev, next) ? prev : next));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const measure = () => setSize((s) => (s && s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, confirming]);

  useEffect(() => {
    if (!confirming) nextRef.current?.focus({ preventScroll: true });
  }, [index, confirming]);

  const go = useCallback(
    (delta: 1 | -1) => {
      if (delta === 1 && last) onClose();
      else setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta)));
    },
    [last, onClose, steps.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setConfirming((c) => !c);
      } else if (!confirming && e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (!confirming && e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [confirming, go]);

  useEffect(() => {
    if (!box || animate) return;
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [box, animate]);

  const pos = size ? position(box, size, step.placement) : null;

  return (
    <div className="tour no-print" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-blocker" />
      <div
        className={`tour-spotlight${box ? '' : ' is-empty'}${animate ? ' is-animated' : ''}`}
        style={box ? { top: box.top, left: box.left, width: box.width, height: box.height } : undefined}
      />
      <div
        ref={popRef}
        key={confirming ? 'confirm' : index}
        className={`tour-pop${pos?.placement ? ` tour-pop--${pos.placement}` : ''}`}
        style={pos ? { top: pos.top, left: pos.left, ['--arrow' as string]: `${pos.arrow}px` } : { visibility: 'hidden' }}
      >
        {confirming ? (
          <>
            <h3 id="tour-title">Zakończyć samouczek?</h3>
            <p>Możesz go uruchomić ponownie w każdej chwili przyciskiem „Samouczek” w górnym pasku.</p>
            <div className="tour-foot">
              <div className="spacer" />
              <button className="btn btn-ghost" onClick={() => setConfirming(false)} autoFocus>
                Nie
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Tak
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="tour-head">
              <span className="tour-count">
                {index + 1} / {steps.length}
              </span>
              <button className="icon-btn tour-close" onClick={() => setConfirming(true)} aria-label="Zamknij samouczek" title="Zamknij">
                <IconClose />
              </button>
            </div>
            <h3 id="tour-title">{step.title}</h3>
            <div className="tour-body">{step.body}</div>
            <div className="tour-foot">
              <div className="tour-dots" aria-hidden>
                {steps.map((_, i) => (
                  <span key={i} className={i === index ? 'is-active' : i < index ? 'is-done' : ''} />
                ))}
              </div>
              <div className="spacer" />
              {index > 0 && (
                <button className="btn btn-ghost" onClick={() => go(-1)}>
                  Wstecz
                </button>
              )}
              <button ref={nextRef} className="btn btn-primary" onClick={() => go(1)}>
                {last ? 'Zakończ' : 'Dalej'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
