import { useCallback, useRef, useState } from 'react';

interface State {
  past: string[];
  present: string;
  future: string[];
}

const LIMIT = 150;
const COALESCE_MS = 900;

/** Historia zmian źródła Markdown. Kolejne zmiany tego samego pola w krótkim czasie łączą się w jeden krok. */
export function useHistory(initial: string) {
  const [state, setState] = useState<State>({ past: [], present: initial, future: [] });
  const lastEdit = useRef({ key: '', time: 0 });

  const set = useCallback((value: string, key = '') => {
    const now = Date.now();
    const coalesce = key !== '' && key === lastEdit.current.key && now - lastEdit.current.time < COALESCE_MS;
    lastEdit.current = { key, time: now };
    setState((s) =>
      value === s.present
        ? s
        : { past: coalesce ? s.past : [...s.past, s.present].slice(-LIMIT), present: value, future: [] },
    );
  }, []);

  const undo = useCallback(() => {
    lastEdit.current = { key: '', time: 0 };
    setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    lastEdit.current = { key: '', time: 0 };
    setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  }, []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
