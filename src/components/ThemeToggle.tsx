import { useId, useState } from 'react';
import type { Theme } from '../lib/theme';

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Przełącznik motywu. Kulka „przelewa się” na drugą stronę (rozciąga i kurczy), a słońce płynnie
 * zamienia się w księżyc: promienie chowają się z obrotem, tarcza rośnie, a cień nasuwa się w sierp.
 * W ciemnym motywie na torze zapalają się gwiazdki.
 */
export function ThemeToggle({ theme, onChange }: Props) {
  const dark = theme === 'dark';
  const maskId = useId();
  // Animacje dopiero po pierwszym kliknięciu, żeby nic nie „przeskakiwało” przy wczytaniu strony.
  const [touched, setTouched] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Ciemny motyw"
      title={dark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
      className={`theme-toggle${dark ? ' is-dark' : ''}${touched ? ' is-touched' : ''}`}
      onClick={() => {
        setTouched(true);
        onChange(dark ? 'light' : 'dark');
      }}
    >
      <span className="tt-stars" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="tt-hint" aria-hidden>
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
        </svg>
      </span>
      <span className="tt-thumb" aria-hidden>
        <svg className="tt-icon" viewBox="0 0 24 24" width="16" height="16">
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="24" height="24" fill="#fff" />
              <circle className="tt-shadow" cx="17.5" cy="7" r="7" fill="#000" />
            </mask>
          </defs>
          <g className="tt-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {RAYS.map((deg) => (
              <line key={deg} x1="12" y1="2.2" x2="12" y2="4.4" transform={`rotate(${deg} 12 12)`} />
            ))}
          </g>
          <circle className="tt-core" cx="12" cy="12" r="8.5" fill="currentColor" mask={`url(#${maskId})`} />
        </svg>
      </span>
    </button>
  );
}
