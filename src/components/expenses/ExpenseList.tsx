import { Trash2, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { EmptyState } from '../ui/EmptyState';

export function ExpenseList() {
  const { expenses, user } = useStore();
  const { deleteExpense } = useExpenses();

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="لا توجد مصاريف"
        description="أضف أول مصروف للمجموعة"
      />
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map(expense => {
        const myShare = expense.splits.find(s => s.uid === user?.uid);
        const isMyExpense = expense.paidBy === user?.uid;

        return (
          <div key={expense.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Receipt className="text-slate-400" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold truncate">{expense.title}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {expense.paidByName} · {format(new Date(expense.date), 'dd MMM', { locale: ar })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-white font-bold">{expense.amount.toFixed(2)} $</span>
                    {isMyExpense && (
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {myShare && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800">
                    {isMyExpense ? (
                      <span className="text-emerald-400">دفعت أنت</span>
                    ) : (
                      <span className="text-red-400">حصتك: {myShare.amount.toFixed(2)} $</span>
                    )}
                  </div>
                )}
                {expense.note && (
                  <p className="text-slate-500 text-xs mt-1.5 italic">{expense.note}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
