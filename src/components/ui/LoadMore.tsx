import { RefObject } from 'react';

interface LoadMoreProps {
  hasMore: boolean;
  remaining: number;
  loadMore: () => void;
  sentinelRef: RefObject<HTMLDivElement>;
}

// Infinite-scroll sentinel + manual "show more" button. Spread a usePagination
// result into it: <LoadMore {...page} />
export function LoadMore({ hasMore, remaining, loadMore, sentinelRef }: LoadMoreProps) {
  if (!hasMore) return null;
  return (
    <div ref={sentinelRef} className="py-4 flex justify-center">
      <button
        onClick={loadMore}
        className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
      >
        عرض المزيد ({remaining})
      </button>
    </div>
  );
}
