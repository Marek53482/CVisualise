import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/*
 * Pola formularza z lokalnym buforem. Dokument jest za każdym razem serializowany i parsowany ponownie,
 * co przycina spacje i puste wiersze na końcu. Bufor pozwala pisać naturalnie, a synchronizuje się
 * z dokumentem tylko przy zmianie z zewnątrz (import, cofnięcie, edycja w Markdown).
 */

const trim = (v: string) => v.trim();

/** Tak jak parser: bez spacji na końcu każdego wiersza i bez pustych wierszy na brzegach. */
const trimLines = (v: string) =>
  v
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .trim();

function useBuffer(value: string, normalize: (v: string) => string) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft((d) => (normalize(d) === value ? d : value));
  }, [value]);
  return [draft, setDraft] as const;
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onValue: (value: string) => void;
};

export function BufferedInput({ value, onValue, ...rest }: InputProps) {
  const [draft, setDraft] = useBuffer(value, trim);
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        onValue(e.target.value.trim());
      }}
    />
  );
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string;
  onValue: (value: string) => void;
  minRows?: number;
};

export function BufferedTextarea({ value, onValue, minRows = 3, ...rest }: TextareaProps) {
  const [draft, setDraft] = useBuffer(value, trimLines);
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [draft]);

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={minRows}
      value={draft}
      spellCheck
      onChange={(e) => {
        setDraft(e.target.value);
        onValue(e.target.value);
      }}
    />
  );
}
