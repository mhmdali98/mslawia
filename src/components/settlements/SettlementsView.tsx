import { useState } from 'react';
import { ArrowLeftRight, CheckCircle, Plus, X, ChevronDown, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { confirmAction } from '../../store/useConfirm';
import { getCurrency } from '../../lib/currencies';
import { Transfer } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { usePagination } from '../../hooks/usePagination';

interface Props { transfers: Transfer[]; }

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const { user, members, groups, currentGroupId, addToast } = useStore();
  const { addSettlement } = useExpenses();
  const group = groups.find(g => g.id === currentGroupId);
  const currency = group?.currency || 'USD';
  const symbol = getCurrency(currency).symbol;

  const [from, setFrom] = useState(user?.uid || '');
  const initialTo = members.find(m => m.uid !== user?.uid)?.uid || '';
  const [to, setTo] = useState(initialTo);
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
      </div>
    </div>
  );
}

export function SettlementsView({ transfers }: Props) {
  const { user, settlements, groups, currentGroupId } = useStore();
  const { addSettlement, deleteSettlement } = useExpenses();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [showRecord, setShowRecord] = useState(false);

  const group = groups.find(g => g.id === currentGroupId);
  const groupCurrency = group?.currency || 'USD';
  const groupSymbol = getCurrency(groupCurrency).symbol;
  const isOwner = group?.createdBy === user?.uid;
  const canSettle = isOwner || group?.permissions?.membersCanSettle !== false;

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
      currency: groupCurrency,
    });
    setLoadingKey(null);
  };

  const myTransfers = transfers.filter(t => t.from === user?.uid || t.to === user?.uid);
  const handleSettleAll = async () => {
    const ok = await confirmAction({
      title: 'تسوية جميع ديونك؟',
      description: `سيتم تسجيل ${myTransfers.length} دفعات تشمل كل التحويلات المقترحة المتعلقة بك.`,
      confirmLabel: 'تسوية الكل',
    });
    if (!ok) return;
    setLoadingKey('all');
    for (const t of myTransfers) {
      await addSettlement({
        from: t.from,
        fromName: t.fromName,
        fromPhoto: t.fromPhoto,
        to: t.to,
        toName: t.toName,
        toPhoto: t.toPhoto,
        amount: t.amount,
        currency: groupCurrency,
      });
    }
    setLoadingKey(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAction({
      title: 'حذف التسوية؟',
      description: 'سيتم حذف هذه الدفعة المسجّلة بشكل نهائي.',
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    deleteSettlement(id);
  };

  const isEmpty = transfers.length === 0 && settlements.length === 0;
  const settlementsPage = usePagination(settlements, 10, currentGroupId);
  const transfersPage = usePagination(transfers, 10, currentGroupId);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-300 font-semibold">التسويات</h3>
        {canSettle && (
          <button
            onClick={() => setShowRecord(true)}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Plus size={15} />
            تسجيل دفعة
          </button>
        )}
      </div>

      {transfers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-500 text-xs">تحويلات مقترحة لتصفير الديون بأقل عدد دفعات</p>
            {canSettle && myTransfers.length > 1 && (
              <button
                onClick={handleSettleAll}
                disabled={loadingKey === 'all'}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {loadingKey === 'all' ? <LoadingSpinner size="sm" /> : <><CheckCircle size={12} /> تسوية الكل</>}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {transfersPage.visible.map((t, i) => {
              const key = `${t.from}-${t.to}`;
              const isInvolved = t.from === user?.uid || t.to === user?.uid;
              return (
                <div key={i} className={`card p-4 flex items-center gap-3 ${isInvolved ? 'border-emerald-500/20' : ''}`}>
                  <Avatar uid={t.from} name={t.fromName} photoURL={t.fromPhoto} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-medium">{t.from === user?.uid ? 'أنت' : t.fromName}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-medium">{t.to === user?.uid ? 'أنت' : t.toName}</span>
                    </p>
                    <p className="text-emerald-400 font-bold">{t.amount.toFixed(2)} {groupSymbol}</p>
                  </div>
                  <Avatar uid={t.to} name={t.toName} photoURL={t.toPhoto} size="sm" />
                  {isInvolved && canSettle && (
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
              );
            })}
          </div>
          {transfersPage.hasMore && (
            <div ref={transfersPage.sentinelRef} className="py-3 flex justify-center">
              <button
                onClick={transfersPage.loadMore}
                className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                عرض المزيد ({transfersPage.remaining})
              </button>
            </div>
          )}
        </div>
      )}

      {settlements.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs mb-3">سجل الدفعات المسجّلة</p>
          <div className="space-y-2">
            {settlementsPage.visible.map(s => {
              const symbol = getCurrency(s.currency || groupCurrency).symbol;
              const canDelete = isOwner || s.createdBy === user?.uid;
              return (
                <div key={s.id} className="card p-4 flex items-center gap-3">
                  <Avatar uid={s.from} name={s.fromName} photoURL={s.fromPhoto} size="sm" />
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
                  <span className="text-slate-400 font-medium text-sm">{s.amount.toFixed(2)} {symbol}</span>
                  <CheckCircle className="text-emerald-500" size={16} />
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {settlementsPage.hasMore && (
            <div ref={settlementsPage.sentinelRef} className="py-3 flex justify-center">
              <button
                onClick={settlementsPage.loadMore}
                className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                عرض المزيد ({settlementsPage.remaining})
              </button>
            </div>
          )}
        </div>
      )}

      {isEmpty && (
        <EmptyState
          icon={ArrowLeftRight}
          title="لا توجد تسويات"
          description="أضف مصاريف لترى التسويات المقترحة، أو سجّل دفعة يدوية"
          action={canSettle ? { label: 'تسجيل دفعة', onClick: () => setShowRecord(true) } : undefined}
        />
      )}

      {showRecord && <RecordPaymentModal onClose={() => setShowRecord(false)} />}
    </div>
  );
}
