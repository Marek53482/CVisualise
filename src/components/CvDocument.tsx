import type { CSSProperties, ReactNode, Ref } from 'react';
import { FONTS, getStyle, metaText, sectionKind, type CvDoc, type CvStyle, type SectionKind } from '../lib/format';
import { groupBlocks, parseBlocks, type ContentBlock, type Item } from '../lib/blocks';
import { autoLabels, renderInline, safeUrl, websiteHref } from '../lib/inline';

export type SelectTarget = { kind: 'header' } | { kind: 'intro' } | { kind: 'section'; index: number };

interface Props {
  doc: CvDoc;
  pages?: number;
  onSelect?: (target: SelectTarget) => void;
  sheetRef?: Ref<HTMLElement>;
  contentRef?: Ref<HTMLDivElement>;
  rulerRef?: Ref<HTMLDivElement>;
}

export function styleVars(style: CvStyle): Record<string, string> {
  const { num } = style;
  return {
    '--cv-font': FONTS[style.font].stack,
    '--cv-size': `${num['font-size']}pt`,
    '--cv-lh': String(num['line-height']),
    '--cv-gap': `${num['section-gap']}px`,
    '--cv-mx': `${num['margin-x']}mm`,
    '--cv-mt': `${num['margin-top']}mm`,
    '--cv-mb': `${num['margin-bottom']}mm`,
    '--cv-accent': style.accent,
  };
}

function ContentView({ block, kind, k }: { block: ContentBlock; kind: SectionKind; k: string }) {
  const fmt = (text: string, key: string) => renderInline(autoLabels(text, kind), key);
  switch (block.type) {
    case 'p':
      return <p className={block.subtle ? 'cv-p cv-p--meta' : 'cv-p'}>{fmt(block.text, k)}</p>;
    case 'ul':
      return (
        <ul className="cv-list">
          {block.items.map((item, i) => (
            <li key={i}>{fmt(item, `${k}-${i}`)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="cv-list cv-list--ordered" start={block.start}>
          {block.items.map((item, i) => (
            <li key={i}>{fmt(item, `${k}-${i}`)}</li>
          ))}
        </ol>
      );
    case 'quote':
      return <blockquote className="cv-quote">{fmt(block.text, k)}</blockquote>;
    case 'hr':
      return <hr className="cv-rule" />;
    case 'pagebreak':
      return <div className="cv-pagebreak" aria-hidden />;
  }
}

function ItemView({ item, kind, k }: { item: Item; kind: SectionKind; k: string }) {
  if (item.type !== 'entry') return <ContentView block={item} kind={kind} k={k} />;
  return (
    <div className="cv-entry">
      <div className="cv-entry-head">
        <h3 className="cv-entry-title">{renderInline(item.title, `${k}-t`)}</h3>
        {item.date && <span className="cv-entry-date">{item.date}</span>}
      </div>
      {item.children.map((child, i) => (
        <ContentView key={i} block={child} kind={kind} k={`${k}-${i}`} />
      ))}
    </div>
  );
}

function Body({ text, kind, k }: { text: string; kind: SectionKind; k: string }) {
  const items = groupBlocks(parseBlocks(text));
  return (
    <>
      {items.map((item, i) => (
        <ItemView key={i} item={item} kind={kind} k={`${k}-${i}`} />
      ))}
    </>
  );
}

export function CvDocument({ doc, pages = 1, onSelect, sheetRef, contentRef, rulerRef }: Props) {
  const style = getStyle(doc.meta);
  const role = metaText(doc.meta, 'role');
  const email = metaText(doc.meta, 'email');
  const phone = metaText(doc.meta, 'phone');
  const location = metaText(doc.meta, 'location');
  const website = metaText(doc.meta, 'website');
  const interactive = Boolean(onSelect);

  const hit = (target: SelectTarget) =>
    interactive
      ? {
          onClick: () => onSelect!(target),
          title: 'Kliknij, aby edytować',
        }
      : {};

  const contacts = [
    location && { key: 'loc', node: location },
    phone && { key: 'tel', node: safeUrl(`tel:${phone.replace(/[^\d+]/g, '')}`) ? <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a> : phone },
    email && { key: 'mail', node: safeUrl(`mailto:${email}`) ? <a href={`mailto:${email}`}>{email}</a> : email },
    website && {
      key: 'www',
      node: websiteHref(website) ? (
        <a href={websiteHref(website)!} target="_blank" rel="noopener noreferrer">
          {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      ) : (
        website
      ),
    },
  ].filter(Boolean) as { key: string; node: ReactNode }[];

  return (
    <article className={`cv-sheet${interactive ? ' is-interactive' : ''}`} style={styleVars(style) as CSSProperties} ref={sheetRef}>
      <div className="cv-ruler" ref={rulerRef} aria-hidden />
      <div className="cv-content" ref={contentRef}>
        <header {...hit({ kind: 'header' })} className={`cv-header ${interactive ? 'cv-hit' : ''}`}>
          <h1 className="cv-name">{doc.name || 'Imię i nazwisko'}</h1>
          {role && <p className="cv-role">{role}</p>}
          {contacts.length > 0 && (
            <ul className="cv-contacts">
              {contacts.map((c) => (
                <li key={c.key}>{c.node}</li>
              ))}
            </ul>
          )}
        </header>

        {doc.intro && (
          <div {...hit({ kind: 'intro' })} className={`cv-section cv-section--intro ${interactive ? 'cv-hit' : ''}`}>
            <Body text={doc.intro} kind="standard" k="intro" />
          </div>
        )}

        {doc.sections.map((section, index) => {
          const kind = sectionKind(section.title);
          const showTitle = kind !== 'profile' && kind !== 'footer' && section.title.trim() !== '';
          return (
            <section
              key={index}
              {...hit({ kind: 'section', index })}
              className={`cv-section cv-section--${kind} ${interactive ? 'cv-hit' : ''}`}
            >
              {showTitle && <h2 className="cv-section-title">{section.title}</h2>}
              <Body text={section.body} kind={kind} k={`s${index}`} />
            </section>
          );
        })}
      </div>

      {Array.from({ length: Math.max(0, pages - 1) }, (_, i) => (
        <div
          key={i}
          className="cv-page-marker"
          style={{ top: `calc(var(--cv-mt) + ${i + 1} * (297mm - var(--cv-mt) - var(--cv-mb)))` }}
          aria-hidden
        >
          <span>koniec strony {i + 1}</span>
        </div>
      ))}
    </article>
  );
}
