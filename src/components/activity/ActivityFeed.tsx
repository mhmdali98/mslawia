import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getCurrency } from '../../lib/currencies';
import { getExpenseCategory } from '../../lib/categories';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { usePagination } from '../../hooks/usePagination';
import { Expense, Settlement } from '../../types';

type ActivityItem =
  | { type: 'expense'; data: Expense; timestamp: string }
  | { type: 'settlement'; data: Settlement; timestamp: string };

export function ActivityFeed() {
  const { expenses, settlements, user, groups, currentGroupId } = useStore();

  const group = groups.find(g => g.id === currentGroupId);
  const groupCurrency = group?.currency || 'USD';

  const items: ActivityItem[] = [
    ...expenses.map(e => ({ type: 'expense' as const, data: e, timestamp: e.createdAt })),
    ...settlements.map(s => ({ type: 'settlement' as const, data: s, timestamp: s.settledAt })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const { visible, hasMore, loadMore, sentinelRef, remaining } = usePagination(items, 10, currentGroupId);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="لا يوجد نشاط"
        description="أضف مصاريف أو سجّل تسويات لتظهر هنا"
      />
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((item, i) => {
        if (item.type === 'expense') {
          const e = item.data;
          const symbol = getCurrency(e.currency || groupCurrency).symbol;
          const cat = getExpenseCategory(e.category);
          const CatIcon = cat.icon;
          const isPayer = e.paidBy === user?.uid;
          const myShare = e.splits.find(s => s.uid === user?.uid);

          return (
            <div key={`e-${e.id}-${i}`} className="card p-3 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                <CatIcon size={16} className={cat.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm leading-snug">
                  <span className="font-medium">
                    {isPayer ? 'أنت' : e.paidByName}
                  </span>
                  <span className="text-slate-400"> أضاف </span>
                  <span className="font-medium text-white">"{e.title}"</span>
                </p>
                {myShare && (
                  <p className={`text-xs mt-0.5 ${isPayer ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPayer ? `دفعت ${e.amount.toFixed(2)} ${symbol}` : `حصتك ${myShare.amount.toFixed(2)} ${symbol}`}
                  </p>
                )}
                <p className="text-slate-600 text-xs mt-0.5">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ar })}
                </p>
              </div>
              <span className="text-slate-400 text-sm font-medium flex-shrink-0">
                {e.amount.toFixed(2)} {symbol}
              </span>
            </div>
          );
        }

        const s = item.data;
        const symbol = getCurrency(s.currency || groupCurrency).symbol;
        const isFrom = s.from === user?.uid;
        const isTo = s.to === user?.uid;

        return (
          <div key={`s-${s.id}-${i}`} className="card p-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Avatar uid={s.from} name={s.fromName} photoURL={s.fromPhoto} size="xs" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-sm leading-snug">
                <span className="font-medium">{isFrom ? 'أنت' : s.fromName}</span>
                <span className="text-slate-400"> دفع لـ </span>
                <span className="font-medium">{isTo ? 'أنت' : s.toName}</span>
              </p>
              {s.note && <p className="text-slate-500 text-xs mt-0.5 italic">{s.note}</p>}
              <p className="text-slate-600 text-xs mt-0.5">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ar })}
              </p>
            </div>
            <span className="text-emerald-400 text-sm font-medium flex-shrink-0">
              {s.amount.toFixed(2)} {symbol}
            </span>
          </div>
        );
      })}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          <button
            onClick={loadMore}
            className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            عرض المزيد ({remaining})
          </button>
        </div>
      )}
    </div>
  );
}
