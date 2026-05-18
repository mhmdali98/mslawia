import { useEffect, useRef, useState } from 'react';

export function usePagination<T>(items: T[], pageSize = 10, resetKey?: unknown) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  useEffect(() => { setVisibleCount(pageSize); }, [pageSize, resetKey]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visibleCount >= items.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(c => Math.min(c + pageSize, items.length));
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, items.length, pageSize]);

  const loadMore = () => setVisibleCount(c => Math.min(c + pageSize, items.length));
  const hasMore = visibleCount < items.length;

  return { visible: items.slice(0, visibleCount), hasMore, loadMore, sentinelRef, remaining: items.length - visibleCount };
}
