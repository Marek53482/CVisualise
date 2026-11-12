import { useRef } from 'react';
import { IconWarn } from './Icons';

interface Props {
  source: string;
  onChange: (value: string) => void;
  error: { message: string; line?: number } | null;
  warnings: string[];
  onFormat: () => void;
}

export function SourceEditor({ source, onChange, error, warnings, onFormat }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const goToLine = (line: number) => {
    const el = ref.current;
    if (!el) return;
    const lines = source.split('\n');
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    el.focus();
    el.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
    el.scrollTop = Math.max(0, (line - 4) * lh);
  };

  return (
    <div className="source">
      {error && (
        <div className="notice notice--error">
          <IconWarn />
          <div>
            <strong>Błąd w pliku{error.line ? ` (wiersz ${error.line})` : ''}</strong>
            <p>{error.message}</p>
            <p className="small">Podgląd pokazuje ostatnią poprawną wersję. Eksport jest wstrzymany do czasu poprawienia błędu.</p>
            {error.line && (
              <button className="btn-link" onClick={() => goToLine(error.line!)}>
                Przejdź do wiersza {error.line}
              </button>
            )}
          </div>
        </div>
      )}
      {!error && warnings.length > 0 && (
        <div className="notice notice--warn">
          <IconWarn />
          <div>
            <strong>Uwagi do pliku</strong>
            <ul>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <textarea
        ref={ref}
        className="source-input"
        value={source}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Źródło Markdown"
      />
      <div className="source-foot">
        <span className="muted small">
          {source.split('\n').length} wierszy · {source.length.toLocaleString('pl-PL')} znaków
        </span>
        <button className="btn-link" onClick={onFormat} disabled={Boolean(error)} title="Ujednolica blok ustawień i odstępy">
          Uporządkuj zapis
        </button>
      </div>
    </div>
  );
}
