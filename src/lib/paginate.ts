/*
 * Podział CV na kartki A4 dla generatora PDF (lib/pdfExport.ts).
 *
 * Działa na kopii arkusza z klasą .is-export. Górny margines pierwszej kartki daje padding arkusza, a na kolejnych
 * kartkach odstęp (pusty blok o zadanej wysokości) wstawiany przed blokiem, który nie mieści się na stronie.
 * Bloku nie dzielimy w środku: tytuł sekcji i nagłówek wpisu przechodzą razem z tym, co po nich następuje.
 */

const PAGE_MM = 297;
const TOLERANCE_MM = 0.3;

interface Unit {
  el: HTMLElement;
  /** Nagłówek trzymany razem z następnym blokiem (tytuł sekcji, nagłówek wpisu). */
  glue?: boolean;
  /** Ręczny podział strony z Markdown. */
  forced?: boolean;
}

export function paginate(sheet: HTMLElement, marginTopMm: number, marginBottomMm: number) {
  const ruler = sheet.querySelector<HTMLElement>('.cv-ruler');
  const content = sheet.querySelector<HTMLElement>('.cv-content');
  if (!ruler || !content) return;

  const pxPerMm = ruler.getBoundingClientRect().height / 100;
  if (!pxPerMm) return;
  const sheetTop = () => sheet.getBoundingClientRect().top;
  const topMm = (el: HTMLElement) => (el.getBoundingClientRect().top - sheetTop()) / pxPerMm;
  const bottomMm = (el: HTMLElement) => (el.getBoundingClientRect().bottom - sheetTop()) / pxPerMm;
  const available = PAGE_MM - marginTopMm - marginBottomMm;

  const push = (target: HTMLElement, targetMm: number) => {
    // Odstęp przed najbardziej zewnętrznym elementem zaczynającym się w tym samym miejscu
    // (np. przed całą sekcją, a nie przed jej tytułem). Jego własny górny margines zastępuje odstęp.
    let el = target;
    while (el.parentElement && el.parentElement !== content && !el.previousElementSibling) el = el.parentElement;
    el.classList.add('cv-pushed');
    const spacer = document.createElement('div');
    spacer.className = 'cv-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    el.before(spacer);
    let height = 0;
    for (let i = 0; i < 4; i++) {
      const delta = targetMm - topMm(el);
      if (Math.abs(delta) < 0.05) break;
      height = Math.max(0, height + delta);
      spacer.style.height = `${height.toFixed(3)}mm`;
    }
  };

  const units = collect(content, (el) => (bottomMm(el) - topMm(el)) <= available);
  // Ręczny podział: odstęp przed blokiem następującym po znaczniku.
  let forcedPage: number | null = null;
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const top = topMm(unit.el);
    const page = Math.floor(top / PAGE_MM);

    if (unit.forced) {
      if (forcedPage === null) forcedPage = page;
      continue;
    }
    if (forcedPage !== null) {
      push(unit.el, (forcedPage + 1) * PAGE_MM + marginTopMm);
      forcedPage = null;
      continue;
    }
    const overflows = bottomMm(unit.el) > (page + 1) * PAGE_MM - marginBottomMm + TOLERANCE_MM;
    const inTopMargin = page > 0 && top < page * PAGE_MM + marginTopMm - TOLERANCE_MM;
    if (!overflows && !inTopMargin) continue;

    // Blok nie mieści się na stronie: przenosimy go razem z doklejonymi nagłówkami.
    let start = i;
    while (start > 0 && units[start - 1].glue && !units[start - 1].forced) start--;
    const first = units[start].el;
    const firstTop = topMm(first);
    const firstPage = Math.floor(firstTop / PAGE_MM);
    const pageStart = firstPage * PAGE_MM + marginTopMm;
    if (firstPage > 0 && firstTop < pageStart - TOLERANCE_MM) push(first, pageStart);
    else if (firstTop > pageStart + 0.5) push(first, pageStart + PAGE_MM);
  }
}

/** Bloki, między którymi wolno przejść na nową kartkę, w kolejności czytania. */
function collect(root: HTMLElement, fits: (el: HTMLElement) => boolean): Unit[] {
  const out: Unit[] = [];
  for (const child of Array.from(root.children) as HTMLElement[]) {
    const cls = child.classList;
    if (cls.contains('cv-pagebreak')) out.push({ el: child, forced: true });
    else if (cls.contains('cv-section-title') || cls.contains('cv-entry-head')) out.push({ el: child, glue: true });
    else if (cls.contains('cv-section--footer')) out.push({ el: child });
    else if (cls.contains('cv-entry')) {
      if (fits(child)) out.push({ el: child });
      else out.push(...collect(child, fits));
    } else if (cls.contains('cv-section') || cls.contains('cv-list')) out.push(...collect(child, fits));
    else out.push({ el: child });
  }
  return out;
}
