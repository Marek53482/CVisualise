/*
 * Podział CV na kartki do druku bez marginesów strony (telefony).
 *
 * iOS nie pozwala wyłączyć nagłówka i stopki w oknie drukowania, a przeglądarka wpisuje je w marginesy
 * strony. Na telefonie drukujemy więc z marginesem strony 0, a odstępy od krawędzi daje sam arkusz:
 * górny przez padding, a na kolejnych kartkach przez odstęp (pusty blok o zadanej wysokości) wstawiany przed
 * blokiem, który nie mieści się na stronie. Odstęp to nie margines, bo marginesy na granicy stron przeglądarka
 * obcina. Odstępy są widoczne tylko w druku i podczas pomiaru.
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

/**
 * Tryb druku bez marginesów strony. Ustawiany poza Reactem (atrybut na <html> i styl na końcu <body>),
 * żeby nie zmienił się w trakcie drukowania, gdy przeglądarka przelicza układ dla szerokości kartki.
 */
export function setBarePrint(on: boolean) {
  document.documentElement.toggleAttribute('data-print-bare', on);
  let style = document.getElementById('cv-print-bare');
  if (on && !style) {
    style = document.createElement('style');
    style.id = 'cv-print-bare';
    style.textContent = '@page { size: A4 portrait; margin: 0; }';
    document.body.appendChild(style);
  } else if (!on) style?.remove();
}

export function clearPagination(root: ParentNode = document) {
  root.querySelectorAll('.cv-print-spacer').forEach((el) => el.remove());
  root.querySelectorAll<HTMLElement>('[data-print-push]').forEach((el) => delete el.dataset.printPush);
}

export function paginateForPrint(sheet: HTMLElement, marginTopMm: number, marginBottomMm: number) {
  clearPagination(sheet);
  const ruler = sheet.querySelector<HTMLElement>('.cv-ruler');
  const content = sheet.querySelector<HTMLElement>('.cv-content');
  if (!ruler || !content) return;

  sheet.classList.add('is-paginating');
  try {
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
      el.dataset.printPush = '1';
      const spacer = document.createElement('div');
      spacer.className = 'cv-print-spacer';
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
  } finally {
    sheet.classList.remove('is-paginating');
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
