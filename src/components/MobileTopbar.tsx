import { useEffect, useRef } from 'react';
import type { Theme } from '../lib/theme';
import { ThemeToggle } from './ThemeToggle';
import { IconFile, IconHelp, IconImport, IconMenu, IconPdf, IconRedo, IconSave, IconTour, IconUndo } from './Icons';

interface Props {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onImport: () => void;
  onSave: () => void;
  onExport: () => void;
  exportDisabled: boolean;
  onFormat: () => void;
  onTour: () => void;
  onNew: () => void;
  onExample: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  onTheme: (theme: Theme) => void;
}

/**
 * Górny pasek na telefonie: nazwa i menu w pierwszym wierszu, trzy najważniejsze akcje w drugim.
 * Mniej używane opcje są w rozwijanym menu.
 */
export function MobileTopbar(p: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { menuOpen, setMenuOpen } = p;

  // Zamknięcie menu po dotknięciu poza nim (z wyjątkiem samouczka, który może je otwierać).
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (menuRef.current?.contains(target) || target.closest?.('.tour')) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, setMenuOpen]);

  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="m-topbar no-print">
      <div className="m-topbar-row">
        <div className="brand" aria-label="CVisualise">
          <span className="brand-cv">CV</span>isualise
        </div>
        <div className="m-menu" ref={menuRef}>
          <button
            className={`icon-btn m-menu-btn${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Więcej opcji"
            data-tour="menu"
          >
            <IconMenu width={20} height={20} />
          </button>
          {menuOpen && (
            <div className="m-menu-panel" role="menu">
              <button role="menuitem" onClick={run(p.onFormat)} data-tour="m-format">
                <IconHelp /> Format dla AI
              </button>
              <button role="menuitem" onClick={run(p.onTour)}>
                <IconTour /> Samouczek
              </button>
              <div className="m-menu-sep" />
              <button role="menuitem" onClick={run(p.onNew)}>
                <IconFile /> Nowe CV
              </button>
              <button role="menuitem" onClick={run(p.onExample)}>
                <IconFile /> Przykładowe CV
              </button>
              <div className="m-menu-sep" />
              <div className="m-menu-pair">
                <button role="menuitem" onClick={p.onUndo} disabled={!p.canUndo}>
                  <IconUndo /> Cofnij
                </button>
                <button role="menuitem" onClick={p.onRedo} disabled={!p.canRedo}>
                  <IconRedo /> Ponów
                </button>
              </div>
              <div className="m-menu-sep" />
              <div className="m-menu-theme">
                <span>Ciemny motyw</span>
                <ThemeToggle theme={p.theme} onChange={p.onTheme} />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="m-actions">
        <button className="btn" onClick={p.onImport} data-tour="import">
          <IconImport /> Importuj
        </button>
        <button className="btn" onClick={p.onSave} data-tour="save">
          <IconSave /> Zapisz
        </button>
        <button className="btn btn-primary" onClick={p.onExport} disabled={p.exportDisabled} data-tour="export">
          <IconPdf /> PDF
        </button>
      </div>
    </header>
  );
}
