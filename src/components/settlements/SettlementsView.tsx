import { useState } from 'react';
import { ArrowLeftRight, CheckCircle, Plus, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { Transfer } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Props { transfers: Transfer[]; }

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const { user, members } = useStore();
  const { addSettlement } = useExpenses();
  const others = members.filter(m => m.uid !== user?.uid);
  const [from, setFrom] = useState(user?.uid || '');
  const [to, setTo] = useState(others[0]?.uid || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useStore();

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
      note: note.trim() || undefined,
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">تسجيل دفعة</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">من دفع؟</label>
              <div className="relative">
                <select className="input appearance-none" value={from} onChange={e => setFrom(e.target.value)}>
                  {members.map(m => (
                    <option key={m.uid} value={m.uid}>{m.uid === user?.uid ? 'أنا' : m.displayName}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
            <div>
              <label className="label">لمن؟</label>
              <div className="relative">
                <select className="input appearance-none" value={to} onChange={e => setTo(e.target.value)}>
                  {members.filter(m => m.uid !== from).map(m => (
                    <option key={m.uid} value={m.uid}>{m.uid === user?.uid ? 'أنا' : m.displayName}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">المبلغ ($)</label>
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
      </div>
    </div>
  );
}

export function SettlementsView({ transfers }: Props) {
  const { user, settlements } = useStore();
  const { addSettlement } = useExpenses();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [showRecord, setShowRecord] = useState(false);

  const handleSettle = async (t: Transfer) => {
    const key = `${t.from}-${t.to}`;
    setLoadingKey(key);
    await addSettlement({
      from: t.from,
      fromName: t.fromName,
      fromPhoto: t.fromPhoto,
      to: t.to,
      toName: t.toName,
      toPhoto: t.toPhoto,
      amount: t.amount,
    });
    setLoadingKey(null);
  };

  const isEmpty = transfers.length === 0 && settlements.length === 0;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-300 font-semibold">التسويات</h3>
        <button
          onClick={() => setShowRecord(true)}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <Plus size={15} />
          تسجيل دفعة
        </button>
      </div>

      {transfers.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs mb-3">تحويلات مقترحة لتصفير الديون بأقل عدد دفعات</p>
          <div className="space-y-2">
            {transfers.map((t, i) => {
              const key = `${t.from}-${t.to}`;
              const isInvolved = t.from === user?.uid || t.to === user?.uid;
              return (
                <div key={i} className={`card p-4 flex items-center gap-3 ${isInvolved ? 'border-emerald-500/20' : ''}`}>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.fromPhoto
                      ? <img src={t.fromPhoto} alt={t.fromName} className="w-9 h-9 rounded-full" />
                      : <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">{t.fromName[0]}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-medium">{t.from === user?.uid ? 'أنت' : t.fromName}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-medium">{t.to === user?.uid ? 'أنت' : t.toName}</span>
                    </p>
                    <p className="text-emerald-400 font-bold">{t.amount.toFixed(2)} $</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.toPhoto
                      ? <img src={t.toPhoto} alt={t.toName} className="w-9 h-9 rounded-full" />
                      : <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">{t.toName[0]}</div>
                    }
                    {/* both payer and receiver can confirm */}
                    {isInvolved && (
                      <button
                        onClick={() => handleSettle(t)}
                        disabled={loadingKey === key}
                        className="btn-primary text-xs flex items-center gap-1.5"
                      >
                        {loadingKey === key
                          ? <LoadingSpinner size="sm" />
                          : <><CheckCircle size={13} /> تمّت</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {settlements.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs mb-3">سجل الدفعات المسجّلة</p>
          <div className="space-y-2">
            {settlements.map(s => (
              <div key={s.id} className="card p-4 flex items-center gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.fromPhoto
                    ? <img src={s.fromPhoto} alt={s.fromName} className="w-9 h-9 rounded-full opacity-80" />
                    : <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">{s.fromName[0]}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm">
                    <span className="font-medium">{s.from === user?.uid ? 'أنت' : s.fromName}</span>
                    <span className="text-slate-500 mx-1">دفع لـ</span>
                    <span className="font-medium">{s.to === user?.uid ? 'أنت' : s.toName}</span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    {format(new Date(s.settledAt), 'dd MMM yyyy', { locale: ar })}
                    {s.note && <span className="text-slate-600"> · {s.note}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-slate-400 font-medium text-sm">{s.amount.toFixed(2)} $</span>
                  <CheckCircle className="text-emerald-500" size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEmpty && (
        <EmptyState
          icon={ArrowLeftRight}
          title="لا توجد تسويات"
          description="أضف مصاريف لترى التسويات المقترحة، أو سجّل دفعة يدوية"
          action={{ label: 'تسجيل دفعة', onClick: () => setShowRecord(true) }}
        />
      )}

      {showRecord && <RecordPaymentModal onClose={() => setShowRecord(false)} />}
    </div>
  );
}
