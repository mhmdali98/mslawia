import { useState } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getCurrency } from '../../lib/currencies';
import { getExpenseCategory } from '../../lib/categories';
import { Avatar } from '../ui/Avatar';
import { Expense } from '../../types';

interface Props {
  expense: Expense;
  user: { uid: string } | null;
  members: { uid: string; displayName: string; photoURL: string }[];
  defaultCurrency: string;
  canEdit: boolean;
  getNickname: (uid: string, fallback: string) => string;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}

export function ExpenseCard({ expense, user, members, defaultCurrency, canEdit, getNickname, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  const myShare = expense.splits.find(s => s.uid === user?.uid);
  const isMyExpense = expense.paidBy === user?.uid;
  const symbol = getCurrency(expense.currency || defaultCurrency).symbol;
  const cat = getExpenseCategory(expense.category);
  const CatIcon = cat.icon;

  return (
    <div className="card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${cat.bg} hover:opacity-80`}
          >
            <CatIcon className={cat.color} size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-white font-semibold truncate hover:text-emerald-300 transition-colors text-right w-full text-sm"
                >
                  {expense.title}
                </button>
                <p className="text-slate-500 text-xs mt-0.5">
                  {getNickname(expense.paidBy, expense.paidByName)} · {format(new Date(expense.date), 'dd MMM', { locale: ar })}
                  {expense.updatedAt && (
                    <span className="text-slate-600">
                      · مُعدَّل{expense.updatedByName ? ` بواسطة ${expense.updatedByName}` : ''}
                    </span>
                  )}
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
                {canEdit && (
                  <>
                    <button
                      onClick={() => onEdit(expense)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                      aria-label="تعديل"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(expense)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      aria-label="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {expense.note && (
              <p className="text-slate-500 text-xs mt-2 italic">{expense.note}</p>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
          <p className="text-slate-500 text-xs font-medium mb-2">تفاصيل التقسيم</p>
          {expense.splits.map(s => {
            const member = members.find(m => m.uid === s.uid);
            const isPayer = s.uid === expense.paidBy;
            return (
              <div key={s.uid} className="flex items-center gap-2.5">
                <Avatar uid={s.uid} name={member?.displayName || '?'} photoURL={member?.photoURL} size="xs" />
                <span className="text-slate-300 text-xs flex-1">
                  {s.uid === user?.uid ? 'أنت' : getNickname(s.uid, member?.displayName || '؟')}
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
}
