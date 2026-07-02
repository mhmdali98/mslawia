import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { addSettlement } from '../../lib/actions';
import { getCurrency } from '../../lib/currencies';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

export function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const { user, members, groups, currentGroupId, addToast } = useStore();
  const group = groups.find(g => g.id === currentGroupId);
  const currency = group?.currency || 'USD';
  const symbol = getCurrency(currency).symbol;

  const [from, setFrom] = useState(user?.uid || '');
  const [to, setTo] = useState(members.find(m => m.uid !== user?.uid)?.uid || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { addToast('أدخل مبلغاً صحيحاً.', 'error'); return; }
    if (from === to) { addToast('المُرسِل والمُستلِم يجب أن يكونا مختلفَين.', 'error'); return; }
    const fromMember = members.find(m => m.uid === from);
    const toMember = members.find(m => m.uid === to);
    if (!fromMember || !toMember) return;
    setLoading(true);
    await addSettlement({
      from: fromMember.uid,
      fromName: fromMember.displayName,
      fromPhoto: fromMember.photoURL,
      to: toMember.uid,
      toName: toMember.displayName,
      toPhoto: toMember.photoURL,
      amount: amt,
      currency,
      note,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal title="تسجيل دفعة" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">من دفع؟</label>
            <Select value={from} onChange={e => setFrom(e.target.value)}>
              {members.map(m => (
                <option key={m.uid} value={m.uid}>{m.uid === user?.uid ? 'أنا' : m.displayName}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">لمن؟</label>
            <Select value={to} onChange={e => setTo(e.target.value)}>
              {members.filter(m => m.uid !== from).map(m => (
                <option key={m.uid} value={m.uid}>{m.uid === user?.uid ? 'أنا' : m.displayName}</option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="label">المبلغ ({symbol})</label>
          <input
            className="input"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div>
          <label className="label">ملاحظة (اختيارية)</label>
          <input
            className="input"
            placeholder="سبب الدفع..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'تسجيل الدفعة'}
        </button>
      </div>
    </Modal>
  );
}
