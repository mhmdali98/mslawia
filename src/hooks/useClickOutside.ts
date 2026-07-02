import { useEffect, useRef } from 'react';

// Returns a ref; calls onOutside when a mousedown lands outside it (while active).
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  onOutside: () => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, onOutside]);

  return ref;
}
