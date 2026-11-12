import { useEffect, useRef, useState } from 'react';
import { KIND_HINT, metaText, sectionKind, type CvDoc, type TextKey } from '../lib/format';
import { BufferedInput, BufferedTextarea } from './Buffered';
import type { SelectTarget } from './CvDocument';
import { IconChevron, IconDown, IconPlus, IconTrash, IconUp } from './Icons';

type Update = (mutate: (doc: CvDoc) => void, key?: string) => void;

interface Props {
  doc: CvDoc;
  update: Update;
  focus: { target: SelectTarget; nonce: number } | null;
}

const HEADER_FIELDS: { key: TextKey; label: string; placeholder: string; type?: string }[] = [
  { key: 'role', label: 'Stanowisko', placeholder: 'Stanowisko z oferty' },
  { key: 'location', label: 'Lokalizacja', placeholder: 'Miasto' },
  { key: 'phone', label: 'Telefon', placeholder: '+48 000 000 000', type: 'tel' },
  { key: 'email', label: 'E-mail', placeholder: 'imie@example.com', type: 'email' },
  { key: 'website', label: 'Strona / LinkedIn / GitHub', placeholder: 'np. github.com/login' },
];

function snippet(body: string): string {
  const text = body
    .replace(/^#{3,}\s+/gm, '')
    .replace(/\s+::\s*/g, ' · ')
    .replace(/[*`>]|^[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 90 ? text.slice(0, 90) + '…' : text || 'Pusta sekcja';
}

export function ContentEditor({ doc, update, focus }: Props) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Kliknięcie w podglądzie → rozwiń i przewiń do odpowiedniego miejsca.
  useEffect(() => {
    if (!focus) return;
    const t = focus.target;
    const id = t.kind === 'section' ? `sec-${t.index}` : t.kind;
    if (t.kind === 'section') setOpen((s) => new Set(s).add(t.index));
    setFlash(id);
    requestAnimationFrame(() => {
      const el = rootRef.current?.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el?.querySelector<HTMLElement>('textarea, input')?.focus({ preventScroll: true });
    });
    const timer = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(timer);
  }, [focus]);

  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // Zachowanie stanu rozwinięcia przy przesuwaniu / usuwaniu sekcji.
  const remapOpen = (fn: (i: number) => number | null) =>
    setOpen((s) => new Set([...s].map(fn).filter((i): i is number => i !== null)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= doc.sections.length) return;
    update((d) => {
      const [s] = d.sections.splice(index, 1);
      d.sections.splice(target, 0, s);
    });
    remapOpen((i) => (i === index ? target : i === target ? index : i));
  };

  const remove = (index: number) => {
    update((d) => {
      d.sections.splice(index, 1);
    });
    remapOpen((i) => (i === index ? null : i > index ? i - 1 : i));
  };

  const add = () => {
    let at = doc.sections.length;
    if (at > 0 && sectionKind(doc.sections[at - 1].title) === 'footer') at -= 1;
    update((d) => {
      d.sections.splice(at, 0, { title: 'Nowa sekcja', body: '' });
    });
    remapOpen((i) => (i >= at ? i + 1 : i));
    setOpen((s) => new Set(s).add(at));
    requestAnimationFrame(() => {
      const el = rootRef.current?.querySelector<HTMLInputElement>(`[data-anchor="sec-${at}"] input`);
      el?.focus();
      el?.select();
    });
  };

  return (
    <div className="editor" ref={rootRef}>
      <div className="editor-group" data-anchor="header" data-tour="header">
        <div className="list-head">
          <h3>Nagłówek</h3>
        </div>
        <div className={`card${flash === 'header' ? ' is-flash' : ''}`}>
        <div className="card-body">
          <label className="field">
            <span>Imię i nazwisko</span>
            <BufferedInput value={doc.name} onValue={(v) => update((d) => void (d.name = v), 'name')} placeholder="Imię i nazwisko" />
          </label>
          <div className="field-grid">
            {HEADER_FIELDS.map((f) => (
              <label key={f.key} className={`field${f.key === 'role' || f.key === 'website' ? ' field--wide' : ''}`}>
                <span>{f.label}</span>
                <BufferedInput
                  type={f.type ?? 'text'}
                  value={metaText(doc.meta, f.key)}
                  placeholder={f.placeholder}
                  onValue={(v) => update((d) => void (d.meta[f.key] = v), `meta-${f.key}`)}
                />
              </label>
            ))}
          </div>
        </div>
        </div>
      </div>

      {doc.intro && (
        <div className="editor-group" data-anchor="intro">
          <div className="list-head">
            <h3>Wprowadzenie</h3>
            <span className="hint">Tekst przed pierwszą sekcją</span>
          </div>
          <div className={`card${flash === 'intro' ? ' is-flash' : ''}`}>
            <div className="card-body">
              <BufferedTextarea className="md-input" value={doc.intro} onValue={(v) => update((d) => void (d.intro = v), 'intro')} />
            </div>
          </div>
        </div>
      )}

      <div className="editor-group" data-tour="sections">
      <div className="list-head">
        <h3>Sekcje</h3>
        <div className="list-head-actions">
          <button className="btn-link" onClick={() => setOpen(new Set(doc.sections.map((_, i) => i)))}>
            Rozwiń wszystkie
          </button>
          <button className="btn-link" onClick={() => setOpen(new Set())}>
            Zwiń
          </button>
        </div>
      </div>

      {doc.sections.map((section, index) => {
        const kind = sectionKind(section.title);
        const isOpen = open.has(index);
        const anchor = `sec-${index}`;
        return (
          <div key={index} className={`card section-card${isOpen ? ' is-open' : ''}${flash === anchor ? ' is-flash' : ''}`} data-anchor={anchor}>
            <div className="card-head section-head">
              <button className="section-toggle" onClick={() => toggle(index)} aria-expanded={isOpen}>
                <IconChevron className="chev" />
                <span className="section-title-text">{section.title || 'Bez tytułu'}</span>
                {!isOpen && <span className="section-snippet">{snippet(section.body)}</span>}
              </button>
              <div className="section-actions">
                <button className="icon-btn" title="Przesuń w górę" disabled={index === 0} onClick={() => move(index, -1)}>
                  <IconUp />
                </button>
                <button className="icon-btn" title="Przesuń w dół" disabled={index === doc.sections.length - 1} onClick={() => move(index, 1)}>
                  <IconDown />
                </button>
                <button className="icon-btn icon-btn--danger" title="Usuń sekcję (można cofnąć)" onClick={() => remove(index)}>
                  <IconTrash />
                </button>
              </div>
            </div>
            {isOpen && (
              <div className="card-body">
                <label className="field">
                  <span>Tytuł sekcji</span>
                  <BufferedInput
                    value={section.title}
                    onValue={(v) => update((d) => void (d.sections[index].title = v), `title-${index}`)}
                  />
                </label>
                {KIND_HINT[kind] && <p className="kind-hint">{KIND_HINT[kind]}</p>}
                <label className="field">
                  <span>Treść (Markdown)</span>
                  <BufferedTextarea
                    className="md-input"
                    value={section.body}
                    minRows={4}
                    onValue={(v) => update((d) => void (d.sections[index].body = v), `body-${index}`)}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}

      <button className="btn btn-dashed" onClick={add}>
        <IconPlus /> Dodaj sekcję
      </button>
      </div>

      <details className="cheatsheet" data-tour="cheatsheet">
        <summary>Ściągawka składni</summary>
        <table>
          <tbody>
            <tr>
              <td>
                <code>### Firma | Stanowisko :: 01.2023 - 06.2024</code>
              </td>
              <td>Wpis z datą po prawej</td>
            </tr>
            <tr>
              <td>
                <code>- tekst</code>
              </td>
              <td>Punkt listy</td>
            </tr>
            <tr>
              <td>
                <code>**tekst**</code> / <code>*tekst*</code>
              </td>
              <td>Pogrubienie / kursywa</td>
            </tr>
            <tr>
              <td>
                <code>[GitHub](https://github.com/…)</code>
              </td>
              <td>Link</td>
            </tr>
            <tr>
              <td>
                <code>&lt;!-- pagebreak --&gt;</code>
              </td>
              <td>Ręczny podział strony</td>
            </tr>
          </tbody>
        </table>
        <p>Pusta linia rozdziela akapity, pojedynczy Enter daje nowy wiersz.</p>
      </details>
    </div>
  );
}
