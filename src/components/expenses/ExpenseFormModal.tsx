import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useExpenses, ExpenseInput } from '../../hooks/useExpenses';

import { splitEqually } from '../../lib/calculations';
import { getCurrency } from '../../lib/currencies';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { Expense, ExpenseSplit } from '../../types';

interface Props {
  onClose: () => void;
  expense?: Expense;
  defaultCurrency?: string;
}

export function ExpenseFormModal({ onClose, expense, defaultCurrency = 'USD' }: Props) {
  const { user, members, addToast, settlements } = useStore();
  const { addExpense, updateExpense } = useExpenses();
  const isEdit = !!expense;

  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || user?.uid || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>(
    expense?.splitType || 'equal'
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    expense?.splits.map(s => s.uid) || []
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    expense?.splits.reduce((acc, s) => ({ ...acc, [s.uid]: s.amount.toString() }), {}) || {}
  );
  const [percentages, setPercentages] = useState<Record<string, string>>(
    expense?.splitType === 'percentage' && expense?.splits
      ? (() => {
          const total = expense.amount;
          return expense.splits.reduce((acc, s) => ({
            ...acc,
            [s.uid]: total > 0 ? ((s.amount / total) * 100).toFixed(1) : '0',
          }), {});
        })()
      : {}
  );
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(expense?.category || 'other');
  const [note, setNote] = useState(expense?.note || '');
  const [loading, setLoading] = useState(false);
  // Show advanced section automatically when editing or when any advanced field is non-default
  const [showAdvanced, setShowAdvanced] = useState(
    !!expense && (
      expense.splitType !== 'equal' ||
      expense.category !== 'other' ||
      !!expense.note ||
      expense.date !== new Date().toISOString().slice(0, 10)
    )
  );

  const currency = expense?.currency || defaultCurrency;
  const currencySymbol = getCurrency(currency).symbol;

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

  const percentageTotal = selectedMembers.reduce(
    (sum, uid) => sum + (parseFloat(percentages[uid] || '0') || 0),
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
    } else if (splitType === 'percentage') {
      if (Math.abs(percentageTotal - 100) > 0.1) {
        addToast(`مجموع النسب (${percentageTotal.toFixed(1)}%) يجب أن يساوي 100%.`, 'error');
        return;
      }
      let remaining = amt;
      splits = selectedMembers.map((uid, idx) => {
        const pct = parseFloat(percentages[uid] || '0') / 100;
        const share = idx === selectedMembers.length - 1
          ? Math.round(remaining * 100) / 100
          : Math.round(amt * pct * 100) / 100;
        remaining -= share;
        return { uid, amount: share };
      });
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
      category,
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
          {isEdit && settlements.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-2">
              تعديل هذا المصروف قد يغير الأرصدة الحالية
            </div>
          )}
          <div>
            <label className="label">اسم المصروف *</label>
            <input className="input" placeholder="مثال: عشاء، تاكسي، بقالة..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="label">المبلغ ({currencySymbol}) *</label>
            <input className="input" type="number" placeholder="0.00" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div>
            <label className="label">من دفع؟</label>
            <div className="relative">
              <select className="input appearance-none cursor-pointer" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                {members.map(m => (
                  <option key={m.uid} value={m.uid}>{m.uid === user?.uid ? `أنا (${m.displayName})` : m.displayName}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(s => !s)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-sm hover:border-slate-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sliders size={14} />
              خيارات متقدمة
            </span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="label">التاريخ</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div>
                <label className="label">الفئة</label>
                <div className="grid grid-cols-4 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const selected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-colors ${
                          selected
                            ? `${cat.bg} border-current ${cat.color}`
                            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <Icon size={18} className={selected ? cat.color : 'text-slate-500'} />
                        <span className={`text-xs leading-tight ${selected ? 'text-white font-medium' : 'text-slate-500'}`}>
                          {cat.labelAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">طريقة التقسيم</label>
                <div className="flex gap-2">
                  {([
                    { key: 'equal', label: 'متساوٍ' },
                    { key: 'percentage', label: 'نسب %' },
                    { key: 'custom', label: 'مخصص' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSplitType(key)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        splitType === key
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                    {checked && splitType === 'percentage' && (
                      <div className="flex items-center gap-1">
                        <input
                          className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white text-center"
                          type="number"
                          placeholder="0"
                          min="0"
                          max="100"
                          step="1"
                          value={percentages[m.uid] || ''}
                          onChange={e => {
                            e.stopPropagation();
                            setPercentages(prev => ({ ...prev, [m.uid]: e.target.value }));
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="text-slate-400 text-xs">%</span>
                      </div>
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
            {splitType === 'percentage' && selectedMembers.length > 0 && (
              <p className={`text-xs mt-2 ${Math.abs(percentageTotal - 100) < 0.1 ? 'text-emerald-400' : 'text-red-400'}`}>
                المجموع: {percentageTotal.toFixed(1)}% من أصل 100%
              </p>
            )}
          </div>

          {showAdvanced && (
            <div>
              <label className="label">ملاحظة (اختيارية)</label>
              <input className="input" placeholder="أي تفاصيل إضافية..." value={note} onChange={e => setNote(e.target.value)} />
            </div>
          )}

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
