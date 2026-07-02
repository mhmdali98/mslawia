import { useState, useMemo } from 'react';
import { Receipt, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { usePagination } from '../../hooks/usePagination';
import { sortExpensesDesc } from '../../lib/calculations';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import { EmptyState } from '../ui/EmptyState';
import { ExpenseSkeleton } from '../ui/Skeleton';
import { LoadMore } from '../ui/LoadMore';
import { ExpenseCard } from './ExpenseCard';

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.slice(0, 7).split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: ar });
}

export function ExpenseList() {
  const { expenses, currentGroupId, expensesLoaded } = useStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses
      .filter(e =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.note?.toLowerCase().includes(q) ||
        e.paidByName.toLowerCase().includes(q)
      )
      .filter(e => !filterCategory || e.category === filterCategory)
      .slice()
      .sort(sortExpensesDesc);
  }, [expenses, search, filterCategory]);

  const page = usePagination(filtered, 10, `${currentGroupId}|${search}|${filterCategory}`);

  if (!expensesLoaded) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <ExpenseSkeleton key={i} />)}
      </div>
    );
  }

  let lastMonth = '';

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            className="input pr-9 pl-8"
            placeholder="بحث في المصاريف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCategory(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              !filterCategory
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            الكل
          </button>
          {EXPENSE_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const active = filterCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(active ? null : cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? `${cat.bg} border-current ${cat.color}`
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Icon size={12} className={active ? cat.color : 'text-slate-500'} />
                {cat.labelAr}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        expenses.length === 0 ? (
          <EmptyState icon={Receipt} title="لا توجد مصاريف" description="أضف أول مصروف للمجموعة" />
        ) : (
          <EmptyState icon={Search} title="لا نتائج" description="جرّب تغيير كلمة البحث أو الفئة" />
        )
      ) : (
        <>
          <div className="space-y-2">
            {page.visible.map(expense => {
              const monthKey = expense.date.slice(0, 7);
              const isNewMonth = monthKey !== lastMonth;
              lastMonth = monthKey;
              return (
                <div key={expense.id}>
                  {isNewMonth && (
                    <p className="text-slate-500 text-xs font-medium px-1 pt-3 pb-2">
                      {monthLabel(expense.date)}
                    </p>
                  )}
                  <ExpenseCard expense={expense} />
                </div>
              );
            })}
          </div>
          <LoadMore {...page} />
        </>
      )}
    </div>
  );
}
