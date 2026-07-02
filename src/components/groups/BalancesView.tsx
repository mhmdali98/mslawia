import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, ArrowLeftRight, Plus, ArrowUpLeft, ArrowDownRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useSettle } from '../../hooks/useSettle';
import { useNickname } from '../../hooks/useNickname';
import { getPerms } from '../../lib/permissions';
import { Avatar } from '../ui/Avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { RecordPaymentModal } from '../settlements/RecordPaymentModal';
import { Balance, Transfer } from '../../types';

interface Props {
  balances: Balance[];
  transfers: Transfer[];
  symbol: string;
  simplifyDebts: boolean;
}

export function BalancesView({ balances, transfers, symbol, simplifyDebts }: Props) {
  const { user, groups, currentGroupId } = useStore();
  const group = groups.find(g => g.id === currentGroupId);
  const { canSettle } = getPerms(group, user?.uid);
  const getNickname = useNickname(currentGroupId ?? undefined);
  const { settlingKey, settle } = useSettle(group?.currency || 'USD');
  const [showRecord, setShowRecord] = useState(false);
  const myUid = user?.uid;

  const memberName = (uid: string, displayName: string) =>
    uid === myUid ? 'أنت' : getNickname(uid, displayName);

  const creditors = balances.filter(b => b.amount > 0.01).sort((a, b) => b.amount - a.amount);
  const debtors = balances.filter(b => b.amount < -0.01).sort((a, b) => a.amount - b.amount);
  const settled = balances.filter(b => Math.abs(b.amount) <= 0.01);

  // Explicit user toggles override the default (creditors + my own card start open)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isOpen = (b: Balance) =>
    overrides[b.uid] ?? (b.amount > 0.01 || b.uid === myUid);
  const toggle = (b: Balance) =>
    setOverrides(prev => ({ ...prev, [b.uid]: !isOpen(b) }));

  const savedCount = debtors.reduce((sum, d) => {
    const directCount = transfers.filter(t => t.from === d.uid).length;
    return sum + (directCount > 1 ? directCount - 1 : 0);
  }, 0);

  if (balances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <CheckCircle size={24} className="text-emerald-400" />
        </div>
        <p className="text-white font-semibold text-lg">جميع الأرصدة مسوّاة</p>
        <p className="text-slate-500 text-sm mt-1">لا توجد ديون بين الأعضاء</p>
      </div>
    );
  }

  const settleButton = (t: Transfer) => {
    const key = `${t.from}-${t.to}`;
    const involved = t.from === myUid || t.to === myUid;
    if (!canSettle || !involved) return null;
    return (
      <button
        onClick={() => settle(t)}
        disabled={settlingKey === key}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {settlingKey === key
          ? <LoadingSpinner size="sm" />
          : <><ArrowLeftRight size={11} /> تسوية</>}
      </button>
    );
  };

  // One card per member; expanding shows BOTH directions in detail:
  // who they must pay (and how much), and who must pay them.
  const memberCard = (b: Balance) => {
    const name = memberName(b.uid, b.displayName);
    const isMe = b.uid === myUid;
    const open = isOpen(b);
    const debts = transfers.filter(t => t.from === b.uid);   // b pays these
    const credits = transfers.filter(t => t.to === b.uid);   // b receives these
    const isCreditor = b.amount > 0.01;
    const isDebtor = b.amount < -0.01;

    return (
      <div key={b.uid} className="card overflow-hidden">
        <button
          onClick={() => toggle(b)}
          className="w-full flex items-center gap-3 p-4 text-right"
        >
          <Avatar uid={b.uid} name={b.displayName} photoURL={b.photoURL} size="md" />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${isCreditor || isDebtor ? 'text-white' : 'text-slate-400'}`}>
              {name}
            </p>
            {isCreditor && (
              <p className="text-emerald-400 font-bold text-base">
                {isMe ? 'تستحق' : 'يستحق'} {b.amount.toFixed(2)} {symbol}
                <span className="text-slate-400 text-xs font-normal"> إجمالاً</span>
              </p>
            )}
            {isDebtor && (
              <p className="text-red-400 font-bold text-base">
                {isMe ? 'عليك' : 'عليه'} {Math.abs(b.amount).toFixed(2)} {symbol}
                <span className="text-slate-400 text-xs font-normal"> إجمالاً</span>
              </p>
            )}
            {!isCreditor && !isDebtor && (
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-0.5">
                <CheckCircle size={13} className="text-emerald-500" />
                مسوّى
              </p>
            )}
          </div>
          {open
            ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" />
            : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
        </button>

        {open && (
          <div className="border-t border-slate-800 px-4 py-3 space-y-3">
            {debts.length > 0 && (
              <div>
                <p className="text-red-400/80 text-xs font-medium mb-2 flex items-center gap-1.5">
                  <ArrowUpLeft size={12} />
                  {isMe ? 'مطلوب منك أن تدفع' : 'مطلوب منه أن يدفع'}
                </p>
                <div className="space-y-2">
                  {debts.map(t => (
                    <div key={`${t.from}-${t.to}`} className="flex items-center gap-2.5">
                      <Avatar uid={t.to} name={t.toName} photoURL={t.toPhoto} size="xs" />
                      <span className="text-slate-300 text-sm flex-1 min-w-0 truncate">
                        لـ <span className="text-white font-medium">{memberName(t.to, t.toName)}</span>
                      </span>
                      <span className="text-red-400 font-bold text-sm flex-shrink-0">
                        {t.amount.toFixed(2)} {symbol}
                      </span>
                      {settleButton(t)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {credits.length > 0 && (
              <div>
                <p className="text-emerald-400/80 text-xs font-medium mb-2 flex items-center gap-1.5">
                  <ArrowDownRight size={12} />
                  {isMe ? 'تستلم من' : 'يستلم من'}
                </p>
                <div className="space-y-2">
                  {credits.map(t => (
                    <div key={`${t.from}-${t.to}`} className="flex items-center gap-2.5">
                      <Avatar uid={t.from} name={t.fromName} photoURL={t.fromPhoto} size="xs" />
                      <span className="text-slate-300 text-sm flex-1 min-w-0 truncate">
                        من <span className="text-white font-medium">{memberName(t.from, t.fromName)}</span>
                      </span>
                      <span className="text-emerald-400 font-bold text-sm flex-shrink-0">
                        {t.amount.toFixed(2)} {symbol}
                      </span>
                      {settleButton(t)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debts.length === 0 && credits.length === 0 && (
              <p className="text-slate-500 text-xs">لا توجد تحويلات معلّقة</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 pb-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-slate-300 font-semibold">الأرصدة</h3>
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

      {[...creditors, ...debtors, ...settled].map(memberCard)}

      {/* Simplify debts banner */}
      {simplifyDebts && savedCount > 0 && (
        <div className="mt-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 flex items-center gap-3">
          <ArrowLeftRight size={16} className="text-emerald-400 flex-shrink-0" />
          <p className="text-slate-300 text-sm">
            تبسيط الديون مفعّل · يوفّر{' '}
            <span className="text-emerald-400 font-bold">{savedCount}</span>
            {' '}تحويل على مجموعتك
          </p>
        </div>
      )}

      {showRecord && <RecordPaymentModal onClose={() => setShowRecord(false)} />}
    </div>
  );
}
