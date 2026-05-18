import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useExpenses, ExpenseInput } from '../../hooks/useExpenses';
import { splitEqually } from '../../lib/calculations';
import { getCurrency } from '../../lib/currencies';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { Expense, ExpenseSplit } from '../../types';

interface Props {
  onClose: () => void;
  expense?: Expense;
  defaultCurrency?: string;
}

export function ExpenseFormModal({ onClose, expense, defaultCurrency = 'USD' }: Props) {
  const { user, members, addToast } = useStore();
  const { addExpense, updateExpense } = useExpenses();
  const isEdit = !!expense;

  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || user?.uid || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>(expense?.splitType || 'equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    expense?.splits.map(s => s.uid) || []
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    expense?.splits.reduce((acc, s) => ({ ...acc, [s.uid]: s.amount.toString() }), {}) || {}
  );
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(expense?.note || '');
  const [loading, setLoading] = useState(false);

  const currency = expense?.currency || defaultCurrency;
  const currencySymbol = getCurrency(currency).symbol;

  // initialize selected members when members load (new expense only)
  useEffect(() => {
    if (!isEdit && members.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(members.map(m => m.uid));
    }
    if (!paidBy && user?.uid) setPaidBy(user.uid);
  }, [members, user, isEdit]);

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const equalShare = selectedMembers.length > 0 && amount
    ? (parseFloat(amount) / selectedMembers.length).toFixed(2)
    : '0.00';

  const customTotal = selectedMembers.reduce(
    (sum, uid) => sum + (parseFloat(customAmounts[uid] || '0') || 0),
    0
  );

  const handleSubmit = async () => {
    if (!title.trim()) { addToast('أدخل اسم المصروف.', 'error'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { addToast('أدخل مبلغاً صحيحاً.', 'error'); return; }
    if (selectedMembers.length === 0) { addToast('اختر الأعضاء المشاركين.', 'error'); return; }

    let splits: ExpenseSplit[] = [];

    if (splitType === 'equal') {
      const dist = splitEqually(amt, selectedMembers);
      splits = selectedMembers.map(uid => ({ uid, amount: dist[uid] }));
    } else {
      if (Math.abs(customTotal - amt) > 0.01) {
        addToast(`مجموع المبالغ (${customTotal.toFixed(2)}) لا يساوي الإجمالي (${amt.toFixed(2)}).`, 'error');
        return;
      }
      splits = selectedMembers.map(uid => ({
        uid,
        amount: parseFloat(customAmounts[uid] || '0'),
      }));
    }

    const payer = members.find(m => m.uid === paidBy);
    if (!payer) { addToast('لم يتم تحديد الدافع. انتظر تحميل الأعضاء.', 'error'); return; }

    const data: ExpenseInput = {
      title: title.trim(),
      amount: amt,
      currency,
      paidBy,
      paidByName: payer.displayName,
      paidByPhoto: payer.photoURL,
      splits,
      splitType,
      date,
      note: note.trim() || undefined,
    };

    setLoading(true);
    if (isEdit && expense) {
      await updateExpense(expense.id, data);
    } else {
      await addExpense(data);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'تعديل المصروف' : 'إضافة مصروف'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">اسم المصروف *</label>
            <input className="input" placeholder="مثال: عشاء، تاكسي، بقالة..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">المبلغ ({currencySymbol}) *</label>
              <input className="input" type="number" placeholder="0.00" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">التاريخ</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">من دفع؟</label>
            <div className="relative">
              <select className="input appearance-none cursor-pointer" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                {members.map(m => (
                  <option key={m.uid} value={m.uid}>{m.displayName}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div>
            <label className="label">طريقة التقسيم</label>
            <div className="flex gap-2">
              {(['equal', 'custom'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSplitType(type)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    splitType === type
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {type === 'equal' ? 'تقسيم متساوٍ' : 'مبالغ مخصصة'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">المشاركون</label>
            <div className="space-y-2">
              {members.map(m => {
                const checked = selectedMembers.includes(m.uid);
                return (
                  <div
                    key={m.uid}
                    onClick={() => toggleMember(m.uid)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      checked
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                    }`}>
                      {checked && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <Avatar uid={m.uid} name={m.displayName} photoURL={m.photoURL} size="sm" />
                    <span className="text-white text-sm flex-1">{m.displayName}</span>
                    {checked && splitType === 'equal' && (
                      <span className="text-slate-400 text-xs">{equalShare} {currencySymbol}</span>
                    )}
                    {checked && splitType === 'custom' && (
                      <input
                        className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white text-center"
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={customAmounts[m.uid] || ''}
                        onChange={e => {
                          e.stopPropagation();
                          setCustomAmounts(prev => ({ ...prev, [m.uid]: e.target.value }));
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {splitType === 'custom' && amount && (
              <p className={`text-xs mt-2 ${Math.abs(customTotal - parseFloat(amount)) < 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
                المجموع: {customTotal.toFixed(2)} {currencySymbol} من أصل {parseFloat(amount).toFixed(2)} {currencySymbol}
              </p>
            )}
          </div>

          <div>
            <label className="label">ملاحظة (اختيارية)</label>
            <input className="input" placeholder="أي تفاصيل إضافية..." value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : isEdit ? 'حفظ التعديلات' : 'إضافة المصروف'}
          </button>
        </div>
      </div>
    </div>
  );
}
