import { useState } from 'react';
import { Trash2, Receipt, Edit2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { getCurrency } from '../../lib/currencies';
import { EXPENSE_CATEGORIES, getExpenseCategory } from '../../lib/categories';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { ExpenseFormModal } from './ExpenseFormModal';
import { Expense } from '../../types';

export function ExpenseList() {
  const { expenses, user, members, groups, currentGroupId } = useStore();
  const { deleteExpense } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const group = groups.find(g => g.id === currentGroupId);
  const defaultCurrency = group?.currency || 'USD';

  const filtered = expenses
    .filter(e =>
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.note?.toLowerCase().includes(search.toLowerCase()) ||
      e.paidByName.toLowerCase().includes(search.toLowerCase())
    )
    .filter(e => !filterCategory || e.category === filterCategory);

  const canEdit = (e: Expense) => e.paidBy === user?.uid || e.createdBy === user?.uid;

  const handleDelete = (e: Expense) => {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return;
    deleteExpense(e.id);
  };

  const toggleExpand = (id: string) => setExpanded(prev => prev === id ? null : id);

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
        <div className="space-y-3">
          {filtered.map(expense => {
            const myShare = expense.splits.find(s => s.uid === user?.uid);
            const isMyExpense = expense.paidBy === user?.uid;
            const symbol = getCurrency(expense.currency || defaultCurrency).symbol;
            const cat = getExpenseCategory(expense.category);
            const CatIcon = cat.icon;
            const isExpanded = expanded === expense.id;

            return (
              <div key={expense.id} className="card overflow-hidden">
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

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                    <p className="text-slate-500 text-xs font-medium mb-2">تفاصيل التقسيم</p>
                    {expense.splits.map(s => {
                      const member = members.find(m => m.uid === s.uid);
                      const isPayer = s.uid === expense.paidBy;
                      return (
                        <div key={s.uid} className="flex items-center gap-2.5">
                          <Avatar
                            uid={s.uid}
                            name={member?.displayName || '?'}
                            photoURL={member?.photoURL}
                            size="xs"
                          />
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
            );
          })}
        </div>
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
