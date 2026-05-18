import { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, Receipt, Edit2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { getCurrency } from '../../lib/currencies';
import { EXPENSE_CATEGORIES, getExpenseCategory } from '../../lib/categories';
import { confirmAction } from '../../store/useConfirm';
import { EmptyState } from '../ui/EmptyState';
import { ExpenseSkeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { ExpenseFormModal } from './ExpenseFormModal';
import { Expense } from '../../types';

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function monthLabel(dateStr: string) {
  const [y, m] = dateStr.slice(0, 7).split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

export function ExpenseList() {
  const { expenses, user, members, groups, currentGroupId, expensesLoaded } = useStore();
  const { deleteExpense } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const group = groups.find(g => g.id === currentGroupId);
  const defaultCurrency = group?.currency || 'USD';
  const isOwner = group?.createdBy === user?.uid;

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

  const toggleExpand = (id: string) => setExpanded(prev => prev === id ? null : id);

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
            expanded={expanded}
            toggleExpand={toggleExpand}
            canEdit={canEdit}
            setEditing={setEditing}
            handleDelete={handleDelete}
            user={user}
            members={members}
            defaultCurrency={defaultCurrency}
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
  expanded: string | null;
  toggleExpand: (id: string) => void;
  canEdit: (e: Expense) => boolean;
  setEditing: (e: Expense) => void;
  handleDelete: (e: Expense) => void;
  user: { uid: string } | null;
  members: { uid: string; displayName: string; photoURL: string }[];
  defaultCurrency: string;
}

function ExpenseListItems({
  filtered, expanded, toggleExpand, canEdit, setEditing, handleDelete, user, members, defaultCurrency,
}: ItemsProps) {
  let lastMonth = '';

  return (
    <div className="space-y-2">
      {filtered.map(expense => {
        const monthKey = expense.date.slice(0, 7);
        const isNewMonth = monthKey !== lastMonth;
        lastMonth = monthKey;

        const myShare = expense.splits.find(s => s.uid === user?.uid);
        const isMyExpense = expense.paidBy === user?.uid;
        const symbol = getCurrency(expense.currency || defaultCurrency).symbol;
        const cat = getExpenseCategory(expense.category);
        const CatIcon = cat.icon;
        const isExpanded = expanded === expense.id;

        return (
          <div key={expense.id}>
            {isNewMonth && (
              <p className="text-slate-500 text-xs font-medium px-1 pt-3 pb-2">
                {monthLabel(expense.date)}
              </p>
            )}
            <div className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleExpand(expense.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${cat.bg} hover:opacity-80`}
                  >
                    <CatIcon className={cat.color} size={18} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => toggleExpand(expense.id)}
                          className="text-white font-semibold truncate hover:text-emerald-300 transition-colors text-right w-full text-sm"
                        >
                          {expense.title}
                        </button>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {expense.paidByName} · {format(new Date(expense.date), 'dd MMM', { locale: ar })}
                          {expense.updatedAt && <span className="text-slate-600"> · مُعدَّل</span>}
                        </p>
                      </div>
                      <span className="text-white font-bold flex-shrink-0">{expense.amount.toFixed(2)} {symbol}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {myShare ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800 ${
                          isMyExpense ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isMyExpense
                            ? `دفعت أنت · حصتك ${myShare.amount.toFixed(2)} ${symbol}`
                            : `حصتك: ${myShare.amount.toFixed(2)} ${symbol}`}
                        </span>
                      ) : <span />}

                      <div className="flex items-center gap-1">
                        {canEdit(expense) && (
                          <>
                            <button
                              onClick={() => setEditing(expense)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                              aria-label="تعديل"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(expense)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              aria-label="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => toggleExpand(expense.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {expense.note && (
                      <p className="text-slate-500 text-xs mt-2 italic">{expense.note}</p>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                  <p className="text-slate-500 text-xs font-medium mb-2">تفاصيل التقسيم</p>
                  {expense.splits.map(s => {
                    const member = members.find(m => m.uid === s.uid);
                    const isPayer = s.uid === expense.paidBy;
                    return (
                      <div key={s.uid} className="flex items-center gap-2.5">
                        <Avatar uid={s.uid} name={member?.displayName || '?'} photoURL={member?.photoURL} size="xs" />
                        <span className="text-slate-300 text-xs flex-1">
                          {s.uid === user?.uid ? 'أنت' : member?.displayName || '؟'}
                          {isPayer && <span className="text-emerald-500 text-xs mr-1">(دافع)</span>}
                        </span>
                        <span className={`text-xs font-medium ${isPayer ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isPayer ? '+' : '-'}{s.amount.toFixed(2)} {symbol}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
