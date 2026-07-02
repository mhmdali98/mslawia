import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { addExpense, updateExpense, ExpenseInput } from '../../lib/actions';
import { splitEqually } from '../../lib/calculations';
import { getCurrency } from '../../lib/currencies';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { CategoryPicker } from '../ui/CategoryPicker';
import { Expense, ExpenseSplit, SplitType } from '../../types';

interface Props {
  onClose: () => void;
  expense?: Expense;
  defaultCurrency?: string;
}

export function ExpenseFormModal({ onClose, expense, defaultCurrency = 'USD' }: Props) {
  const { user, members, addToast, settlements } = useStore();
  const isEdit = !!expense;

  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || user?.uid || '');
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType || 'equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    expense?.splits.map(s => s.uid) || []
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    expense?.splits.reduce((acc, s) => ({ ...acc, [s.uid]: s.amount.toString() }), {}) || {}
  );
  const [percentages, setPercentages] = useState<Record<string, string>>(
    expense?.splitType === 'percentage' && expense.amount > 0
      ? expense.splits.reduce((acc, s) => ({
          ...acc,
          [s.uid]: ((s.amount / expense.amount) * 100).toFixed(1),
        }), {})
      : {}
  );
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(expense?.category || 'other');
  const [note, setNote] = useState(expense?.note || '');
  const [loading, setLoading] = useState(false);
  // Show advanced section automatically when editing with non-default advanced fields
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
  }, [members, user, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const buildSplits = (amt: number): ExpenseSplit[] | null => {
    if (splitType === 'equal') {
      const dist = splitEqually(amt, selectedMembers);
      return selectedMembers.map(uid => ({ uid, amount: dist[uid] }));
    }
    if (splitType === 'percentage') {
      if (Math.abs(percentageTotal - 100) > 0.1) {
        addToast(`مجموع النسب (${percentageTotal.toFixed(1)}%) يجب أن يساوي 100%.`, 'error');
        return null;
      }
      let remaining = amt;
      return selectedMembers.map((uid, idx) => {
        const pct = parseFloat(percentages[uid] || '0') / 100;
        const share = idx === selectedMembers.length - 1
          ? Math.round(remaining * 100) / 100
          : Math.round(amt * pct * 100) / 100;
        remaining -= share;
        return { uid, amount: share };
      });
    }
    if (Math.abs(customTotal - amt) > 0.01) {
      addToast(`مجموع المبالغ (${customTotal.toFixed(2)}) لا يساوي الإجمالي (${amt.toFixed(2)}).`, 'error');
      return null;
    }
    return selectedMembers.map(uid => ({
      uid,
      amount: parseFloat(customAmounts[uid] || '0'),
    }));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { addToast('أدخل اسم المصروف.', 'error'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { addToast('أدخل مبلغاً صحيحاً.', 'error'); return; }
    if (selectedMembers.length === 0) { addToast('اختر الأعضاء المشاركين.', 'error'); return; }

    const splits = buildSplits(amt);
    if (!splits) return;

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
      note: note.trim(),
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
    <Modal title={isEdit ? 'تعديل المصروف' : 'إضافة مصروف'} onClose={onClose}>
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
          <Select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
            {members.map(m => (
              <option key={m.uid} value={m.uid}>{m.uid === user?.uid ? `أنا (${m.displayName})` : m.displayName}</option>
            ))}
          </Select>
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
              <CategoryPicker categories={EXPENSE_CATEGORIES} value={category} onChange={setCategory} />
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
                        onChange={e => setPercentages(prev => ({ ...prev, [m.uid]: e.target.value }))}
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
                      onChange={e => setCustomAmounts(prev => ({ ...prev, [m.uid]: e.target.value }))}
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
    </Modal>
  );
}
