import { useEffect, useState } from 'react';
import formatSpec from '../../docs/FORMAT.md?raw';
import templateSource from '../../examples/szablon.md?raw';
import { downloadText } from '../lib/files';
import { IconCheck, IconClose, IconCopy, IconSave } from './Icons';

interface Props {
  onClose: () => void;
}

export function FormatDialog({ onClose }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatSpec);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* brak uprawnień do schowka — użytkownik może pobrać plik */
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="format-title">
        <div className="modal-head">
          <div>
            <h2 id="format-title">Format pliku dla AI</h2>
            <p className="muted">
              Wyślij tę instrukcję razem ze swoimi danymi i treścią oferty. AI zwróci plik <code>.md</code>, który zaimportujesz tutaj.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Zamknij">
            <IconClose />
          </button>
        </div>
        <pre className="modal-pre">{formatSpec}</pre>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => downloadText(templateSource, 'szablon.md')}>
            Pobierz pusty szablon
          </button>
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={() => downloadText(formatSpec, 'FORMAT.md')}>
            <IconSave /> Pobierz FORMAT.md
          </button>
          <button className="btn btn-primary" onClick={copy}>
            {copied ? <IconCheck /> : <IconCopy />} {copied ? 'Skopiowano' : 'Kopiuj instrukcję'}
          </button>
        </div>
      </div>
    </div>
  );
}
