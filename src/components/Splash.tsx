import { useState } from 'react';

interface Props {
  onCreate: () => void;
  onShowMe: () => void;
}

/** Ekran startowy na telefonie: nazwa aplikacji i dwa przyciski. Pokazywany przy każdym wejściu. */
export function Splash({ onCreate, onShowMe }: Props) {
  const [leaving, setLeaving] = useState(false);

  const go = (next: () => void) => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(next, 260);
  };

  return (
    <div className={`splash no-print${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="CVisualise">
      <div className="splash-inner">
        <h1 className="brand splash-brand">
          <span className="brand-cv">CV</span>isualise
        </h1>
        <div className="splash-actions">
          <button className="btn btn-primary splash-btn splash-btn--primary" onClick={() => go(onCreate)}>
            Stwórz CV
          </button>
          <button className="btn splash-btn splash-btn--secondary" onClick={() => go(onShowMe)}>
            Pokaż mi
          </button>
        </div>
      </div>
    </div>
  );
}
