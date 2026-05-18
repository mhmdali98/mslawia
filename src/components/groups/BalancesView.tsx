import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, ArrowLeftRight } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Balance, Transfer } from '../../types';

interface Props {
  balances: Balance[];
  transfers: Transfer[];
  symbol: string;
  myUid: string | undefined;
  canSettle: boolean;
  simplifyDebts: boolean;
  getNickname: (uid: string, fallback: string) => string;
  settlingKey: string | null;
  onSettle: (transfer: Transfer) => void;
}

function memberName(uid: string, displayName: string, myUid: string | undefined, getNickname: (uid: string, fallback: string) => string) {
  if (uid === myUid) return 'أنت';
  return getNickname(uid, displayName);
}

export function BalancesView({ balances, transfers, symbol, myUid, canSettle, simplifyDebts, getNickname, settlingKey, onSettle }: Props) {
  const creditors = balances.filter(b => b.amount > 0.01).sort((a, b) => b.amount - a.amount);
  const debtors = balances.filter(b => b.amount < -0.01).sort((a, b) => a.amount - b.amount);
  const settled = balances.filter(b => Math.abs(b.amount) <= 0.01);

  const [openUids, setOpenUids] = useState<Set<string>>(() => new Set(creditors.map(c => c.uid)));
  const toggle = (uid: string) => setOpenUids(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });

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

  return (
    <div className="space-y-2 pb-6">
      {/* Creditors */}
      {creditors.map(b => {
        const name = memberName(b.uid, b.displayName, myUid, getNickname);
        const isOpen = openUids.has(b.uid);
        const theirDebtors = transfers.filter(t => t.to === b.uid);

        return (
          <div key={b.uid} className="card overflow-hidden">
            <button
              onClick={() => toggle(b.uid)}
              className="w-full flex items-center gap-3 p-4 text-right"
            >
              <Avatar uid={b.uid} name={b.displayName} photoURL={b.photoURL} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {name} {b.uid === myUid ? 'تستحق استرداد' : 'يستحق استرداد'}
                </p>
                <p className="text-emerald-400 font-bold text-base">
                  {b.amount.toFixed(2)} {symbol} <span className="text-slate-400 text-xs font-normal">إجمالاً</span>
                </p>
              </div>
              {isOpen ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
            </button>

            {isOpen && theirDebtors.length > 0 && (
              <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                {theirDebtors.map(t => {
                  const fromName = memberName(t.from, t.fromName, myUid, getNickname);
                  const key = `${t.from}-${t.to}`;
                  const isMe = t.from === myUid;

                  return (
                    <div key={key} className="px-4 py-3 flex gap-3">
                      <Avatar uid={t.from} name={t.fromName} photoURL={t.fromPhoto} size="sm" className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm leading-snug">
                          <span className="text-white font-medium">{fromName}</span>
                          {' '}يدين بـ{' '}
                          <span className="text-emerald-400 font-bold">{t.amount.toFixed(2)} {symbol}</span>
                          {' '}لـ <span className="text-white font-medium">{name}</span>
                        </p>
                        {(canSettle && isMe) && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => onSettle(t)}
                              disabled={settlingKey === key}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            >
                              {settlingKey === key
                                ? <LoadingSpinner size="sm" />
                                : <><ArrowLeftRight size={12} /> تسوية</>}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Debtors */}
      {debtors.map(b => {
        const name = memberName(b.uid, b.displayName, myUid, getNickname);
        const isOpen = openUids.has(b.uid);
        const theirCreditors = transfers.filter(t => t.from === b.uid);
        const isMe = b.uid === myUid;

        return (
          <div key={b.uid} className="card overflow-hidden">
            <button
              onClick={() => toggle(b.uid)}
              className="w-full flex items-center gap-3 p-4 text-right"
            >
              <Avatar uid={b.uid} name={b.displayName} photoURL={b.photoURL} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {name} {isMe ? 'تدين' : 'يدين'}
                </p>
                <p className="text-red-400 font-bold text-base">
                  {Math.abs(b.amount).toFixed(2)} {symbol} <span className="text-slate-400 text-xs font-normal">إجمالاً</span>
                </p>
              </div>
              {isOpen ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
            </button>

            {isOpen && theirCreditors.length > 0 && (
              <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                {theirCreditors.map(t => {
                  const toName = memberName(t.to, t.toName, myUid, getNickname);
                  const key = `${t.from}-${t.to}`;

                  return (
                    <div key={key} className="px-4 py-3 flex gap-3">
                      <Avatar uid={t.to} name={t.toName} photoURL={t.toPhoto} size="sm" className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm leading-snug">
                          <span className="text-white font-medium">{name}</span>
                          {' '}يدين بـ{' '}
                          <span className="text-red-400 font-bold">{t.amount.toFixed(2)} {symbol}</span>
                          {' '}لـ <span className="text-white font-medium">{toName}</span>
                        </p>
                        {(canSettle && isMe) && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => onSettle(t)}
                              disabled={settlingKey === key}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            >
                              {settlingKey === key
                                ? <LoadingSpinner size="sm" />
                                : <><ArrowLeftRight size={12} /> تسوية</>}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Settled members */}
      {settled.map(b => {
        const name = memberName(b.uid, b.displayName, myUid, getNickname);
        const isOpen = openUids.has(b.uid);
        return (
          <div key={b.uid} className="card overflow-hidden">
            <button
              onClick={() => toggle(b.uid)}
              className="w-full flex items-center gap-3 p-4 text-right"
            >
              <Avatar uid={b.uid} name={b.displayName} photoURL={b.photoURL} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-slate-400 font-semibold text-sm">{name}</p>
                <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-0.5">
                  <CheckCircle size={13} className="text-emerald-500" />
                  مسوّى
                </p>
              </div>
              {isOpen ? <ChevronUp size={18} className="text-slate-600 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-600 flex-shrink-0" />}
            </button>
          </div>
        );
      })}

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
    </div>
  );
}
