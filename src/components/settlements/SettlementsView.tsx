import { useState } from 'react';
import { ArrowLeftRight, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { usePagination } from '../../hooks/usePagination';
import { useSettle } from '../../hooks/useSettle';
import { addSettlement, deleteSettlement, settleTransfer } from '../../lib/actions';
import { confirmAction } from '../../store/useConfirm';
import { getPerms } from '../../lib/permissions';
import { getCurrency } from '../../lib/currencies';
import { Transfer } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { LoadMore } from '../ui/LoadMore';

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
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

export function SettlementsView({ transfers }: { transfers: Transfer[] }) {
  const { user, settlements, groups, currentGroupId } = useStore();
  const [settlingAll, setSettlingAll] = useState(false);
  const [showRecord, setShowRecord] = useState(false);

  const group = groups.find(g => g.id === currentGroupId);
  const groupCurrency = group?.currency || 'USD';
  const groupSymbol = getCurrency(groupCurrency).symbol;
  const { canSettle, canDeleteSettlement } = getPerms(group, user?.uid);
  const { settlingKey, settle } = useSettle(groupCurrency);

  const myTransfers = transfers.filter(t => t.from === user?.uid || t.to === user?.uid);

  const handleSettleAll = async () => {
    const ok = await confirmAction({
      title: 'تسوية جميع ديونك؟',
      description: `سيتم تسجيل ${myTransfers.length} دفعات تشمل كل التحويلات المقترحة المتعلقة بك.`,
      confirmLabel: 'تسوية الكل',
    });
    if (!ok) return;
    setSettlingAll(true);
    for (const t of myTransfers) {
      await settleTransfer(t, groupCurrency);
    }
    setSettlingAll(false);
  };

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
                disabled={settlingAll}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {settlingAll ? <LoadingSpinner size="sm" /> : <><CheckCircle size={12} /> تسوية الكل</>}
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
                      onClick={() => settle(t)}
                      disabled={settlingKey === key}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      {settlingKey === key
                        ? <LoadingSpinner size="sm" />
                        : <><CheckCircle size={13} /> تمّت</>
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <LoadMore {...transfersPage} />
        </div>
      )}

      {settlements.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs mb-3">سجل الدفعات المسجّلة</p>
          <div className="space-y-2">
            {settlementsPage.visible.map(s => {
              const symbol = getCurrency(s.currency || groupCurrency).symbol;
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
                  {canDeleteSettlement(s) && (
                    <button
                      onClick={() => deleteSettlement(s)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <LoadMore {...settlementsPage} />
        </div>
      )}

      {transfers.length === 0 && settlements.length === 0 && (
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
