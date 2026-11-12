import { DEFAULT_ACCENT, DEFAULT_FONT, FONTS, getStyle, NUMERIC, NUMERIC_KEYS, type CvDoc, type FontKey, type NumericKey } from '../lib/format';
import { IconFit } from './Icons';

type Update = (mutate: (doc: CvDoc) => void, key?: string) => void;

const ACCENTS = [
  { color: '#173247', name: 'Granat' },
  { color: '#1f4e79', name: 'Niebieski' },
  { color: '#0f5257', name: 'Morski' },
  { color: '#2f3b45', name: 'Grafit' },
  { color: '#5a2a48', name: 'Śliwka' },
  { color: '#7a2e2e', name: 'Bordo' },
  { color: '#2d5a3d', name: 'Butelkowa zieleń' },
  { color: '#111111', name: 'Czerń' },
];

const GROUPS: { title: string; keys: NumericKey[] }[] = [
  { title: 'Tekst', keys: ['font-size', 'line-height', 'section-gap'] },
  { title: 'Marginesy strony', keys: ['margin-top', 'margin-x', 'margin-bottom'] },
];

interface Props {
  doc: CvDoc;
  update: Update;
  onFit: () => void;
}

export function StyleEditor({ doc, update, onFit }: Props) {
  const style = getStyle(doc.meta);

  const setNum = (key: NumericKey, value: number) => {
    const spec = NUMERIC[key];
    if (!Number.isFinite(value)) return;
    const v = Math.min(spec.max, Math.max(spec.min, value));
    update((d) => void (d.meta[key] = Number(v.toFixed(2))), `style-${key}`);
  };

  const reset = () =>
    update((d) => {
      d.meta.font = DEFAULT_FONT;
      d.meta.accent = DEFAULT_ACCENT;
      for (const key of NUMERIC_KEYS) d.meta[key] = NUMERIC[key].def;
    });

  return (
    <div className="editor">
      <div className="card">
        <div className="card-head">
          <h3>Krój pisma</h3>
        </div>
        <div className="card-body">
          <div className="segmented">
            {(Object.keys(FONTS) as FontKey[]).map((key) => (
              <button
                key={key}
                className={style.font === key ? 'is-active' : ''}
                style={{ fontFamily: FONTS[key].stack }}
                onClick={() => update((d) => void (d.meta.font = key))}
              >
                {FONTS[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Kolor nagłówków</h3>
        </div>
        <div className="card-body">
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.color}
                className={`swatch${style.accent.toLowerCase() === a.color ? ' is-active' : ''}`}
                style={{ background: a.color }}
                title={a.name}
                aria-label={a.name}
                onClick={() => update((d) => void (d.meta.accent = a.color))}
              />
            ))}
            <label className="swatch swatch--custom" title="Własny kolor">
              <input
                type="color"
                value={style.accent}
                onChange={(e) => update((d) => void (d.meta.accent = e.target.value.toLowerCase()), 'style-accent')}
              />
            </label>
            <code className="accent-code">{style.accent}</code>
          </div>
        </div>
      </div>

      {GROUPS.map((group) => (
        <div className="card" key={group.title}>
          <div className="card-head">
            <h3>{group.title}</h3>
          </div>
          <div className="card-body">
            {group.keys.map((key) => {
              const spec = NUMERIC[key];
              const value = style.num[key];
              return (
                <div className="slider" key={key}>
                  <div className="slider-label">
                    <span>{spec.label}</span>
                    <span className="slider-value">
                      <input
                        type="number"
                        min={spec.min}
                        max={spec.max}
                        step={spec.step}
                        value={value}
                        onChange={(e) => setNum(key, e.target.valueAsNumber)}
                      />
                      {spec.unit && <small>{spec.unit}</small>}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    value={value}
                    onChange={(e) => setNum(key, e.target.valueAsNumber)}
                    style={{ ['--fill' as string]: `${((value - spec.min) / (spec.max - spec.min)) * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="style-actions">
        <button className="btn" onClick={onFit}>
          <IconFit /> Dopasuj do 1 strony
        </button>
        <button className="btn btn-ghost" onClick={reset}>
          Przywróć domyślne
        </button>
      </div>
      <p className="muted small">Ustawienia wyglądu zapisują się w bloku ustawień pliku .md, więc kolejne CV od AI mogą je powtórzyć.</p>
    </div>
  );
}
