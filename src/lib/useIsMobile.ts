import { useEffect, useState } from 'react';

/** Telefon: wąski ekran albo telefon obrócony poziomo (niski ekran dotykowy). */
export const MOBILE_QUERY = '(max-width: 760px), (max-height: 500px) and (pointer: coarse)';

export function isMobileNow(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.(MOBILE_QUERY).matches);
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(isMobileNow);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}
