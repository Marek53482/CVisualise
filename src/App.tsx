import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import exampleSource from '../examples/przyklad.md?raw';
import templateSource from '../examples/szablon.md?raw';
import { CvParseError, getStyle, parseCv, serializeCv, suggestedBaseName, type CvDoc } from './lib/format';
import { downloadText, isMarkdownFile, loadDraft, pickFile, saveDraft, withMdExtension } from './lib/files';
import { useHistory } from './lib/useHistory';
import { clearPagination, paginateForPrint, setBarePrint } from './lib/paginate';
import { ContentEditor } from './components/ContentEditor';
import { StyleEditor } from './components/StyleEditor';
import { SourceEditor } from './components/SourceEditor';
import { FormatDialog } from './components/FormatDialog';
import { Preview, type FitOutcome } from './components/Preview';
import { Tour, type TourStep } from './components/Tour';
import { ThemeToggle } from './components/ThemeToggle';
import { applyTheme, initialTheme, saveTheme, type Theme } from './lib/theme';
import { isMobileNow, useIsMobile } from './lib/useIsMobile';
import { MobileTopbar } from './components/MobileTopbar';
import { Splash } from './components/Splash';
import type { SelectTarget } from './components/CvDocument';
import { IconFile, IconHelp, IconImport, IconPdf, IconRedo, IconSave, IconTour, IconUndo, IconWarn } from './components/Icons';

type Tab = 'content' | 'style' | 'source';
type Toast = { id: number; text: string; tone: 'info' | 'error' };
type Parsed = { ok: true; doc: CvDoc; warnings: string[] } | { ok: false; error: { message: string; line?: number } };

const PRINT_TIP_KEY = 'cvisualise:print-tip-hidden';
const TOUR_SEEN_KEY = 'cvisualise:tour-seen';
const EMPTY_DOC = parseCv(templateSource).doc;

function tryParse(source: string): Parsed {
  try {
    return { ok: true, ...parseCv(source) };
  } catch (e) {
    const err = e instanceof CvParseError ? e : new CvParseError(String((e as Error)?.message ?? e));
    return { ok: false, error: { message: err.message, line: err.line } };
  }
}

export default function App() {
  const initial = useMemo(() => loadDraft(), []);
  const history = useHistory(initial?.source ?? exampleSource);
  const source = history.value;
  const [fileName, setFileName] = useState(initial?.fileName || 'przyklad.md');
  const [tab, setTab] = useState<Tab>('content');
  const [focus, setFocus] = useState<{ target: SelectTarget; nonce: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [showPrintTip, setShowPrintTip] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  // Na telefonie przy każdym wejściu najpierw ekran startowy.
  const [splash, setSplash] = useState(isMobileNow);
  const themeMounted = useRef(false);

  useEffect(() => {
    applyTheme(theme, themeMounted.current);
    themeMounted.current = true;
  }, [theme]);

  const changeTheme = useCallback((next: Theme) => {
    setTheme(next);
    saveTheme(next);
  }, []);
  const fitRef = useRef<(() => FitOutcome) | null>(null);

  // Samouczek uruchamia się sam tylko przy pierwszej wizycie.
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(TOUR_SEEN_KEY) === '1';
    } catch {
      /* brak dostępu do pamięci — nie pokazujemy automatycznie */
    }
    // Na telefonie zamiast tego pojawia się ekran startowy z przyciskiem „Pokaż mi”.
    if (seen || isMobileNow()) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
      } catch {
        /* ignoruj */
      }
      setShowTour(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const tourSteps = useMemo<TourStep[]>(() => {
    const content = () => setTab('content');
    return [
      {
        target: 'format',
        placement: 'bottom',
        before: content,
        title: 'Format dla AI',
        body: (
          <>
            <p>Tu znajdziesz instrukcję, według której AI przygotuje Twoje CV w formacie zrozumiałym dla CVisualise.</p>
            <p>
              Skopiuj ją i wklej swojemu modelowi AI (np. ChatGPT, Claude, Gemini) razem ze swoimi danymi o doświadczeniu, wykształceniu i
              umiejętnościach oraz treścią oferty pracy. W odpowiedzi dostaniesz plik <strong>.md</strong> z CV dopasowanym do oferty.
            </p>
          </>
        ),
      },
      {
        target: 'import',
        placement: 'bottom',
        title: 'Importuj .md',
        body: (
          <p>
            Wczytaj plik .md przygotowany przez AI. Możesz też po prostu przeciągnąć plik na okno aplikacji. CV od razu pojawi się w podglądzie po
            prawej.
          </p>
        ),
      },
      {
        target: 'save',
        placement: 'bottom',
        title: 'Zapisz .md',
        body: (
          <p>
            Pobiera aktualną wersję CV jako plik .md, razem z Twoimi poprawkami i ustawieniami wyglądu. Zachowaj go, aby wrócić do edycji później
            albo dać go AI jako bazę przy kolejnej ofercie. Skrót: <kbd>⌘S</kbd>.
          </p>
        ),
      },
      {
        target: 'export',
        placement: 'bottom',
        title: 'Eksportuj PDF',
        body: (
          <p>
            Tworzy gotowe do wysłania CV w PDF. W oknie drukowania wybierz „Zapisz jako PDF”. Plik zawiera prawdziwy tekst, więc dobrze odczytują go
            systemy rekrutacyjne (ATS).
          </p>
        ),
      },
      {
        target: 'header',
        placement: 'right',
        before: content,
        scroll: 'start',
        title: 'Nagłówek',
        body: <p>Imię i nazwisko, stanowisko oraz dane kontaktowe, które pojawiają się na górze CV. Puste pola są po prostu pomijane.</p>,
      },
      {
        target: 'sections',
        placement: 'right',
        before: content,
        scroll: 'start',
        title: 'Sekcje',
        body: (
          <>
            <p>
              Każda część CV, np. profil, doświadczenie czy wykształcenie, to osobna sekcja. Kliknij ją, aby rozwinąć i edytować treść. Strzałkami
              zmienisz kolejność, koszem usuniesz sekcję, a przyciskiem na dole dodasz nową.
            </p>
            <p>Wskazówka: kliknięcie dowolnego fragmentu CV w podglądzie od razu otwiera jego edycję.</p>
          </>
        ),
      },
      {
        target: 'cheatsheet',
        placement: 'right',
        before: content,
        scroll: 'end',
        title: 'Ściągawka składni',
        body: (
          <p>
            Krótka ściąga zapisu treści: jak dodać wpis z datą po prawej, punkt listy, pogrubienie, link albo podział strony. Rozwiń ją, gdy edytujesz
            sekcje.
          </p>
        ),
      },
      {
        target: 'sidebar',
        placement: 'right',
        before: () => setTab('style'),
        title: 'Wygląd',
        body: (
          <p>
            Tu zmienisz krój pisma, kolor nagłówków, wielkość tekstu, interlinię, odstępy i marginesy. Przycisk „Dopasuj do 1 strony” sam dobierze
            ustawienia tak, aby CV zmieściło się na jednej stronie A4.
          </p>
        ),
      },
      {
        target: 'sidebar',
        placement: 'right',
        before: () => setTab('source'),
        title: 'Markdown',
        body: (
          <>
            <p>Cały plik CV w surowej postaci, do edycji bezpośrednio w tekście. Jeśli plik zawiera błąd, zobaczysz tu jego opis i numer wiersza.</p>
            <p>To już wszystko. Samouczek możesz uruchomić ponownie przyciskiem „Samouczek” w górnym pasku.</p>
          </>
        ),
      },
    ];
  }, []);

  // Samouczek na telefon: te same funkcje, ale wskazuje elementy układu mobilnego.
  const mobileTourSteps = useMemo<TourStep[]>(() => {
    const content = () => {
      setMenuOpen(false);
      setTab('content');
    };
    return [
      {
        target: 'm-format',
        placement: 'bottom',
        scroll: 'nearest',
        before: () => {
          setTab('content');
          setMenuOpen(true);
        },
        title: 'Format dla AI',
        body: (
          <>
            <p>W menu ☰ znajdziesz instrukcję, według której AI przygotuje Twoje CV w formacie zrozumiałym dla CVisualise.</p>
            <p>
              Skopiuj ją i wklej swojemu modelowi AI (np. ChatGPT, Claude, Gemini) razem ze swoimi danymi i treścią oferty pracy. W odpowiedzi
              dostaniesz plik <strong>.md</strong> z CV dopasowanym do oferty.
            </p>
          </>
        ),
      },
      {
        target: 'import',
        placement: 'bottom',
        scroll: 'nearest',
        before: content,
        title: 'Importuj',
        body: <p>Wczytaj plik .md przygotowany przez AI, np. z Plików albo z pobranych. CV od razu pojawi się poniżej.</p>,
      },
      {
        target: 'save',
        placement: 'bottom',
        scroll: 'nearest',
        before: content,
        title: 'Zapisz',
        body: (
          <p>Pobiera aktualną wersję CV jako plik .md, razem z poprawkami i wyglądem. Zachowaj go, aby wrócić do edycji albo dać go AI przy kolejnej ofercie.</p>
        ),
      },
      {
        target: 'export',
        placement: 'bottom',
        scroll: 'nearest',
        before: content,
        title: 'PDF',
        body: <p>Tworzy gotowe do wysłania CV w PDF. Otworzy się systemowe okno drukowania, z którego zapiszesz plik PDF.</p>,
      },
      {
        target: 'menu',
        placement: 'bottom',
        scroll: 'nearest',
        before: content,
        title: 'Więcej opcji',
        body: <p>Tu są pozostałe opcje: format dla AI, ten samouczek, nowe lub przykładowe CV, cofanie zmian i ciemny motyw.</p>,
      },
      {
        target: 'preview',
        placement: 'bottom',
        before: content,
        title: 'Podgląd CV',
        body: <p>Tak będzie wyglądać Twoje CV w PDF. Dotknij dowolny fragment, aby od razu przejść do jego edycji.</p>,
      },
      {
        target: 'header',
        placement: 'bottom',
        before: content,
        title: 'Nagłówek',
        body: <p>Imię i nazwisko, stanowisko oraz dane kontaktowe z góry CV. Puste pola są po prostu pomijane.</p>,
      },
      {
        target: 'sections',
        placement: 'bottom',
        before: content,
        title: 'Sekcje',
        body: (
          <p>
            Każda część CV, np. profil, doświadczenie czy wykształcenie, to osobna sekcja. Dotknij jej, aby rozwinąć i edytować treść. Strzałkami
            zmienisz kolejność, koszem usuniesz sekcję, a przyciskiem na dole dodasz nową.
          </p>
        ),
      },
      {
        target: 'cheatsheet',
        placement: 'bottom',
        before: content,
        title: 'Ściągawka składni',
        body: <p>Krótka ściąga zapisu treści: wpis z datą po prawej, punkt listy, pogrubienie, link albo podział strony.</p>,
      },
      {
        target: 'sidebar',
        placement: 'bottom',
        before: () => setTab('style'),
        title: 'Wygląd',
        body: (
          <p>
            Krój pisma, kolor nagłówków, wielkość tekstu, odstępy i marginesy. „Dopasuj do 1 strony” sam dobierze ustawienia tak, aby CV zmieściło się
            na jednej stronie A4.
          </p>
        ),
      },
      {
        target: 'sidebar',
        placement: 'bottom',
        before: () => setTab('source'),
        title: 'Markdown',
        body: (
          <>
            <p>Cały plik CV w surowej postaci, do edycji bezpośrednio w tekście. Jeśli plik zawiera błąd, zobaczysz tu jego opis i numer wiersza.</p>
            <p>To już wszystko. Samouczek uruchomisz ponownie z menu ☰.</p>
          </>
        ),
      },
    ];
  }, []);

  const closeTour = useCallback(() => {
    setShowTour(false);
    setMenuOpen(false);
    setTab('content');
    if (isMobileNow()) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const parsed = useMemo(() => tryParse(source), [source]);
  const lastGood = useRef<CvDoc>(parsed.ok ? parsed.doc : EMPTY_DOC);
  useEffect(() => {
    if (parsed.ok) lastGood.current = parsed.doc;
  }, [parsed]);
  const doc = parsed.ok ? parsed.doc : lastGood.current;
  const docRef = useRef(doc);
  docRef.current = doc;
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  // Telefon: druk bez marginesów strony (iOS nie pozwala wyłączyć nagłówka i stopki), więc CV dzielimy na kartki sami.
  const preparePrint = useCallback(() => {
    const sheet = document.querySelector<HTMLElement>('.preview .cv-sheet');
    if (!sheet) return;
    setBarePrint(isMobileRef.current);
    if (!isMobileRef.current) return clearPagination(sheet);
    const { num } = getStyle(docRef.current.meta);
    paginateForPrint(sheet, num['margin-top'], num['margin-bottom']);
  }, []);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3200);
  }, []);

  // Lokalna kopia robocza.
  useEffect(() => {
    const timer = setTimeout(() => saveDraft({ source, fileName }), 300);
    return () => clearTimeout(timer);
  }, [source, fileName]);

  const update = useCallback(
    (mutate: (d: CvDoc) => void, key?: string) => {
      if (!parsed.ok) return;
      const next = structuredClone(parsed.doc);
      mutate(next);
      history.set(serializeCv(next), key);
    },
    [parsed, history.set],
  );

  const loadText = useCallback(
    (text: string, name: string, message: string) => {
      history.set(text);
      setFileName(name);
      const result = tryParse(text);
      if (result.ok) {
        setTab((t) => (t === 'source' ? 'source' : 'content'));
        toast(result.warnings.length ? `${message} — ${result.warnings.length} uwag(i), zobacz zakładkę Markdown` : message);
      } else {
        setTab('source');
        toast(`Plik ma błąd: ${result.error.message}`, 'error');
      }
    },
    [history.set, toast],
  );

  const pickMarkdown = useCallback(
    () => pickFile(isMobileNow() ? '' : '.md,.markdown,.txt,text/markdown'),
    [],
  );

  const importFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!isMarkdownFile(file)) {
        toast('Wybierz plik .md (Markdown).', 'error');
        return;
      }
      loadText(await file.text(), file.name, `Zaimportowano ${file.name}`);
    },
    [loadText, toast],
  );

  const exportMd = useCallback(() => {
    const name = withMdExtension(fileName || `${suggestedBaseName(docRef.current)}.md`);
    downloadText(source, name);
    toast(`Zapisano ${name}`);
  }, [fileName, source, toast]);

  const print = useCallback(() => {
    if (!parsed.ok) {
      toast('Popraw błąd w pliku przed eksportem do PDF.', 'error');
      setTab('source');
      return;
    }
    preparePrint();
    window.print();
  }, [parsed.ok, toast, preparePrint]);

  const exportPdf = useCallback(() => {
    if (localStorage.getItem(PRINT_TIP_KEY) !== '1') setShowPrintTip(true);
    else print();
  }, [print]);

  // Tytuł dokumentu = domyślna nazwa pliku PDF w oknie drukowania.
  useEffect(() => {
    const original = document.title;
    const before = () => {
      document.title = suggestedBaseName(docRef.current);
      preparePrint();
    };
    const after = () => (document.title = original);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [preparePrint]);

  const fit = useCallback(() => {
    const outcome = fitRef.current?.();
    if (!outcome) return;
    if (outcome.status === 'already') toast('CV już mieści się na jednej stronie.');
    else if (outcome.status === 'impossible') toast('Nie da się zmieścić treści na jednej stronie bez nieczytelnego ściskania — skróć treść.', 'error');
    else {
      update((d) => Object.assign(d.meta, outcome.num));
      const { num } = outcome;
      toast(`Dopasowano: tekst ${num['font-size']} pt, interlinia ${num['line-height']}, odstęp ${num['section-gap']} px. Możesz cofnąć.`);
    }
  }, [toast, update]);

  // Skróty klawiszowe.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const inField = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]');
      if (key === 's') {
        e.preventDefault();
        exportMd();
      } else if (key === 'p') {
        e.preventDefault();
        print();
      } else if (key === 'o') {
        e.preventDefault();
        pickMarkdown().then(importFile);
      } else if (key === 'z' && !inField) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (key === 'y' && !inField) {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportMd, print, importFile, pickMarkdown, history.undo, history.redo]);

  // Przeciągnij i upuść plik .md w dowolne miejsce.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      importFile(e.dataTransfer?.files?.[0] ?? null);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [importFile]);

  const select = useCallback((target: SelectTarget) => {
    setTab('content');
    setFocus({ target, nonce: Date.now() });
  }, []);

  const style = getStyle(doc.meta);
  const pageCss = `@page { size: A4 portrait; margin: ${style.num['margin-top']}mm ${style.num['margin-x']}mm ${style.num['margin-bottom']}mm; }`;
  const warnings = parsed.ok ? parsed.warnings : [];

  return (
    <div className={`app${isMobile ? ' is-mobile' : ''}${showTour ? ' tour-active' : ''}`}>
      <style>{pageCss}</style>

      {isMobile ? (
        <MobileTopbar
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onImport={() => pickMarkdown().then(importFile)}
          onSave={exportMd}
          onExport={exportPdf}
          exportDisabled={!parsed.ok}
          onFormat={() => setShowFormat(true)}
          onTour={() => setShowTour(true)}
          onNew={() => loadText(templateSource, 'nowe-cv.md', 'Utworzono nowe CV z szablonu')}
          onExample={() => loadText(exampleSource, 'przyklad.md', 'Wczytano przykład')}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          theme={theme}
          onTheme={changeTheme}
        />
      ) : (
      <header className="topbar no-print">
        <div className="brand" aria-label="CVisualise">
          <span className="brand-cv">CV</span>isualise
        </div>
        <div className="file-name" title="Nazwa pliku przy zapisie .md">
          <IconFile />
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} spellCheck={false} aria-label="Nazwa pliku" />
        </div>
        <div className="topbar-group">
          <button className="icon-btn" onClick={history.undo} disabled={!history.canUndo} title="Cofnij (⌘Z)">
            <IconUndo />
          </button>
          <button className="icon-btn" onClick={history.redo} disabled={!history.canRedo} title="Ponów (⇧⌘Z)">
            <IconRedo />
          </button>
        </div>
        <div className="spacer" />
        <ThemeToggle theme={theme} onChange={changeTheme} />
        <div className="topbar-group">
          <button className="btn btn-ghost" onClick={() => setShowFormat(true)} title="Instrukcja formatu dla AI" data-tour="format">
            <IconHelp /> <span className="btn-label btn-label--l">Format dla AI</span>
          </button>
          <button className="btn btn-ghost" onClick={() => setShowTour(true)} title="Pokaż samouczek">
            <IconTour /> <span className="btn-label btn-label--l">Samouczek</span>
          </button>
          <div className="menu">
            <button className="btn btn-ghost" onClick={() => loadText(templateSource, 'nowe-cv.md', 'Utworzono nowe CV z szablonu')}>
              Nowe
            </button>
            <button className="btn btn-ghost" onClick={() => loadText(exampleSource, 'przyklad.md', 'Wczytano przykład')}>
              Przykład
            </button>
          </div>
          <button className="btn" onClick={() => pickMarkdown().then(importFile)} title="Importuj .md (⌘O)" data-tour="import">
            <IconImport /> <span className="btn-label btn-label--m">Importuj .md</span>
          </button>
          <button className="btn" onClick={exportMd} title="Zapisz .md (⌘S)" data-tour="save">
            <IconSave /> <span className="btn-label btn-label--m">Zapisz .md</span>
          </button>
          <button className="btn btn-primary" onClick={exportPdf} disabled={!parsed.ok} title="Eksportuj do PDF (⌘P)" data-tour="export">
            <IconPdf /> Eksportuj PDF
          </button>
        </div>
      </header>
      )}

      <main className="workspace">
        <aside className="sidebar no-print" data-tour="sidebar">
          <nav className="tabs" role="tablist">
            {(
              [
                ['content', 'Treść'],
                ['style', 'Wygląd'],
                ['source', 'Markdown'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
                {label}
                {id === 'source' && !parsed.ok && <span className="dot dot--error" />}
                {id === 'source' && parsed.ok && warnings.length > 0 && <span className="dot dot--warn" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-body">
            {tab !== 'source' && !parsed.ok ? (
              <div className="notice notice--error">
                <IconWarn />
                <div>
                  <strong>Plik zawiera błąd</strong>
                  <p>{parsed.error.message}</p>
                  <button className="btn-link" onClick={() => setTab('source')}>
                    Popraw w zakładce Markdown
                  </button>
                </div>
              </div>
            ) : tab === 'content' ? (
              <ContentEditor doc={doc} update={update} focus={focus} />
            ) : tab === 'style' ? (
              <StyleEditor doc={doc} update={update} onFit={fit} />
            ) : (
              <SourceEditor
                source={source}
                onChange={(v) => history.set(v, 'source')}
                error={parsed.ok ? null : parsed.error}
                warnings={warnings}
                onFormat={() => parsed.ok && history.set(serializeCv(parsed.doc))}
              />
            )}
          </div>
        </aside>

        <Preview doc={doc} stale={!parsed.ok} compact={isMobile} onSelect={select} fitRef={fitRef} onFit={fit} />
      </main>

      {dragging && (
        <div className="drop-overlay no-print">
          <div>
            <IconImport width={32} height={32} />
            <p>Upuść plik .md, aby go zaimportować</p>
          </div>
        </div>
      )}

      {isMobile && splash && (
        <Splash
          onCreate={() => setSplash(false)}
          onShowMe={() => {
            setSplash(false);
            setShowTour(true);
          }}
        />
      )}

      {showFormat && <FormatDialog onClose={() => setShowFormat(false)} />}

      {showTour && <Tour steps={isMobile ? mobileTourSteps : tourSteps} onClose={closeTour} mobile={isMobile} />}

      {showPrintTip && (
        <PrintTip
          mobile={isMobile}
          onCancel={() => setShowPrintTip(false)}
          onConfirm={(hide) => {
            if (hide) localStorage.setItem(PRINT_TIP_KEY, '1');
            setShowPrintTip(false);
            setTimeout(print, 50);
          }}
        />
      )}

      <div className="toasts no-print" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintTip({ mobile, onCancel, onConfirm }: { mobile: boolean; onCancel: () => void; onConfirm: (hide: boolean) => void }) {
  const [hide, setHide] = useState(false);
  return (
    <div className="modal-backdrop no-print" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal--small" role="dialog" aria-modal="true">
        <h2>Eksport do PDF</h2>
        <p className="muted">Za chwilę otworzy się okno drukowania. {mobile ? 'Zapisz w nim CV jako PDF:' : 'Ustaw w nim:'}</p>
        {mobile ? (
          <ol className="tip-list">
            <li>
              <strong>Android:</strong> jako drukarkę wybierz „Zapisz jako PDF” i stuknij ikonę PDF.
            </li>
            <li>
              <strong>iPhone:</strong> w opcjach drukowania stuknij „Udostępnij” (albo rozsuń palcami podgląd strony) i wybierz „Zachowaj w
              Plikach”.
            </li>
          </ol>
        ) : (
        <ol className="tip-list">
          <li>
            Miejsce docelowe: <strong>Zapisz jako PDF</strong>
          </li>
          <li>
            Marginesy: <strong>Domyślne</strong> (marginesy CV są już ustawione)
          </li>
          <li>
            Skala: <strong>100%</strong>
          </li>
          <li>
            <strong>Odznacz „Nagłówki i stopki”</strong>, aby w PDF nie było daty i adresu strony
          </li>
          <li>
            Zaznacz <strong>„Grafika tła”</strong>, jeśli kolory wyglądają blado
          </li>
        </ol>
        )}
        <p className="muted small">Nazwa pliku zostanie zaproponowana automatycznie, np. Imie_Nazwisko_CV_Stanowisko.pdf. PDF zawiera prawdziwy tekst — można go zaznaczać i przeszukiwać (ważne dla systemów ATS).</p>
        <label className="check">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> Nie pokazuj ponownie
        </label>
        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={onCancel}>
            Anuluj
          </button>
          <button className="btn btn-primary" onClick={() => onConfirm(hide)} autoFocus>
            <IconPdf /> Otwórz okno drukowania
          </button>
        </div>
      </div>
    </div>
  );
}
