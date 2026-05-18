import { useState } from 'react';
import { Trash2, Receipt, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { getCurrency } from '../../lib/currencies';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { ExpenseFormModal } from './ExpenseFormModal';
import { Expense } from '../../types';

export function ExpenseList() {
  const { expenses, user, members, groups, currentGroupId } = useStore();
  const { deleteExpense } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);

  const group = groups.find(g => g.id === currentGroupId);
  const defaultCurrency = group?.currency || 'USD';

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="لا توجد مصاريف"
        description="أضف أول مصروف للمجموعة"
      />
    );
  }

  const canEdit = (e: Expense) => e.paidBy === user?.uid || e.createdBy === user?.uid;

  const handleDelete = (e: Expense) => {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return;
    deleteExpense(e.id);
  };

  return (
    <div className="space-y-3">
      {expenses.map(expense => {
        const myShare = expense.splits.find(s => s.uid === user?.uid);
        const isMyExpense = expense.paidBy === user?.uid;
        const symbol = getCurrency(expense.currency || defaultCurrency).symbol;

        return (
          <div key={expense.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Receipt className="text-slate-400" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-semibold truncate">{expense.title}</h3>
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
                  {canEdit(expense) && (
                    <div className="flex items-center gap-1">
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
                    </div>
                  )}
                </div>
                {expense.note && (
                  <p className="text-slate-500 text-xs mt-2 italic">{expense.note}</p>
                )}
                {expense.splits.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-1 flex-wrap">
                    <span className="text-slate-600 text-xs ml-1">المشاركون:</span>
                    {expense.splits.slice(0, 6).map(s => {
                      const member = members.find(m => m.uid === s.uid);
                      return (
                        <Avatar
                          key={s.uid}
                          uid={s.uid}
                          name={member?.displayName || '?'}
                          photoURL={member?.photoURL}
                          size="xs"
                        />
                      );
                    })}
                    {expense.splits.length > 6 && (
                      <span className="text-slate-500 text-xs">+{expense.splits.length - 6}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

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
