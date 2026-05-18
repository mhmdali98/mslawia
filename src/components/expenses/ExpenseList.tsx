import { useState, useEffect, useRef, useMemo } from 'react';
import { Receipt, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import { confirmAction } from '../../store/useConfirm';
import { EmptyState } from '../ui/EmptyState';
import { ExpenseSkeleton } from '../ui/Skeleton';
import { ExpenseFormModal } from './ExpenseFormModal';
import { ExpenseCard } from './ExpenseCard';
import { Expense } from '../../types';
import { useMonthName } from '../../lib/i18n';
import { useNickname } from '../../hooks/useNickname';

export function ExpenseList() {
  const { expenses, user, members, groups, currentGroupId, expensesLoaded } = useStore();
  const { deleteExpense } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const monthName = useMonthName();

  const group = groups.find(g => g.id === currentGroupId);
  const defaultCurrency = group?.currency || 'USD';
  const isOwner = group?.createdBy === user?.uid;

  const getMonthLabel = (dateStr: string) => {
    const [y, m] = dateStr.slice(0, 7).split('-');
    return `${monthName(parseInt(m, 10))} ${y}`;
  };

  const getNickname = useNickname(currentGroupId || undefined);

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
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1;
      });
  }, [expenses, search, filterCategory]);

  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, filterCategory, currentGroupId]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visibleCount >= filtered.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length));
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filtered.length]);

  const visible = filtered.slice(0, visibleCount);

  const canEdit = (e: Expense) => isOwner || e.paidBy === user?.uid || e.createdBy === user?.uid;

  const handleDelete = async (e: Expense) => {
    const ok = await confirmAction({
      title: 'حذف المصروف؟',
      description: `سيتم حذف "${e.title}" بشكل نهائي.`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    deleteExpense(e.id);
  };

  if (!expensesLoaded) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <ExpenseSkeleton key={i} />)}
      </div>
    );
  }

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
          <ExpenseListItems
            filtered={visible}
            canEdit={canEdit}
            setEditing={setEditing}
            handleDelete={handleDelete}
            user={user}
            members={members}
            defaultCurrency={defaultCurrency}
            getMonthLabel={getMonthLabel}
            getNickname={getNickname}
          />
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="py-4 flex flex-col items-center gap-2">
              <button
                onClick={() => setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length))}
                className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                عرض المزيد ({filtered.length - visibleCount})
              </button>
            </div>
          )}
        </>
      )}

      {editing && (
        <ExpenseFormModal
          expense={editing}
          defaultCurrency={defaultCurrency}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

interface ItemsProps {
  filtered: Expense[];
  canEdit: (e: Expense) => boolean;
  setEditing: (e: Expense) => void;
  handleDelete: (e: Expense) => void;
  user: { uid: string } | null;
  members: { uid: string; displayName: string; photoURL: string }[];
  defaultCurrency: string;
  getMonthLabel: (dateStr: string) => string;
  getNickname: (uid: string, fallback: string) => string;
}

function ExpenseListItems({
  filtered, canEdit, setEditing, handleDelete, user, members, defaultCurrency, getMonthLabel, getNickname,
}: ItemsProps) {
  let lastMonth = '';

  return (
    <div className="space-y-2">
      {filtered.map(expense => {
        const monthKey = expense.date.slice(0, 7);
        const isNewMonth = monthKey !== lastMonth;
        lastMonth = monthKey;

        return (
          <div key={expense.id}>
            {isNewMonth && (
              <p className="text-slate-500 text-xs font-medium px-1 pt-3 pb-2">
                {getMonthLabel(expense.date)}
              </p>
            )}
            <ExpenseCard
              expense={expense}
              user={user}
              members={members}
              defaultCurrency={defaultCurrency}
              canEdit={canEdit(expense)}
              getNickname={getNickname}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          </div>
        );
      })}
    </div>
  );
}
