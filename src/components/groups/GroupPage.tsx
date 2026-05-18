import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Plus, Users, Receipt, ArrowLeftRight,
  Copy, Trash2, LogOut, Download, MoreVertical, Settings, Activity, BarChart3,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { calculateBalances, calculateMinTransfers, calculateDirectDebts } from '../../lib/calculations';
import { getCurrency } from '../../lib/currencies';
import { ExpenseList } from '../expenses/ExpenseList';
import { ExpenseFormModal } from '../expenses/ExpenseFormModal';
import { SettlementsView } from '../settlements/SettlementsView';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { GroupSettingsModal } from './GroupSettingsModal';
import { ActivityFeed } from '../activity/ActivityFeed';
import { GroupStats } from './GroupStats';
import { getGroupCategory } from '../../lib/categories';
import { confirmAction } from '../../store/useConfirm';
import { usePagination } from '../../hooks/usePagination';
import { useNickname } from '../../hooks/useNickname';

type Tab = 'expenses' | 'balances' | 'settlements' | 'activity' | 'stats';

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, groups, members, expenses, settlements, currentGroupId, setCurrentGroupId, addToast } = useStore();
  const { createInvite, deleteGroup, leaveGroup } = useGroups();
  const { exportBackup } = useExpenses();
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const group = groups.find(g => g.id === groupId);

  useEffect(() => {
    if (groupId) setCurrentGroupId(groupId);
    return () => setCurrentGroupId(null);
  }, [groupId, setCurrentGroupId]);

  if (!group) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 mb-4">المجموعة غير موجودة</p>
        <button onClick={() => navigate('/')} className="btn-secondary">العودة</button>
      </div>
    </div>
  );

  const isOwner = group.createdBy === user?.uid;
  const canAddExpense = isOwner || group.permissions?.membersCanAddExpenses !== false;
  const symbol = getCurrency(group.currency).symbol;
  const groupCat = getGroupCategory(group.category);
  const GroupCatIcon = groupCat.icon;
  const settlementsData = settlements.map(s => ({ from: s.from, to: s.to, amount: s.amount }));
  const balances = calculateBalances(expenses, settlementsData, members);
  const simplify = group.simplifyDebts !== false;
  const transfers = simplify
    ? calculateMinTransfers(balances)
    : calculateDirectDebts(expenses, settlementsData, members);
  const getNickname = useNickname(group.id);

  const handleCopyInvite = async () => {
    const code = await createInvite(group.id, group.name);
    if (code) {
      const link = `${window.location.origin}/mslawia/join/${code}`;
      try {
        await navigator.clipboard.writeText(link);
        addToast('تم نسخ رابط الدعوة!', 'success');
      } catch {
        addToast(`رابط الدعوة: ${link}`, 'info');
      }
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: 'حذف المجموعة؟',
      description: 'سيتم حذف المجموعة وكل بياناتها بشكل نهائي. لا يمكن التراجع.',
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteGroup(group.id);
    navigate('/');
  };

  const handleLeave = async () => {
    const ok = await confirmAction({
      title: 'مغادرة المجموعة؟',
      description: 'لن تتمكن من رؤية المصاريف أو إضافة جديدة بعد المغادرة.',
      confirmLabel: 'مغادرة',
      variant: 'danger',
    });
    if (!ok) return;
    await leaveGroup(group.id);
    navigate('/');
  };

  const myBalance = balances.find(b => b.uid === user?.uid);
  const myTransfers = transfers.filter(t => t.from === user?.uid || t.to === user?.uid);
  const [selectedBalance, setSelectedBalance] = useState<string | null>(null);
  const balancesPage = usePagination(balances, 10, currentGroupId);
  const balanceTransfersPage = usePagination(transfers, 10, currentGroupId);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-4 py-4 sticky top-0 bg-slate-950/95 backdrop-blur z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <ArrowRight size={20} />
            </button>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${groupCat.bg}`}>
              <GroupCatIcon size={18} className={groupCat.color} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{group.name}</h1>
              <p className="text-slate-500 text-xs">{members.length} أعضاء · {group.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canAddExpense && (
              <button
                onClick={() => setShowAddExpense(true)}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                <Plus size={16} />
                مصروف
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <MoreVertical size={20} />
              </button>
              {showMenu && (
                <div className="absolute left-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl min-w-[200px] z-50 overflow-hidden">
                  <button
                    onClick={() => { handleCopyInvite(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Copy size={15} /> دعوة عضو
                  </button>
                  <button
                    onClick={() => { setShowSettings(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Settings size={15} /> إعدادات المجموعة
                  </button>
                  <button
                    onClick={() => { exportBackup(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Download size={15} /> تصدير JSON
                  </button>
                  <div className="border-t border-slate-700" />
                  <button
                    onClick={() => { handleLeave(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    <LogOut size={15} /> مغادرة المجموعة
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => { handleDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 size={15} /> حذف المجموعة
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {myBalance && Math.abs(myBalance.amount) > 0.01 && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className={`rounded-2xl p-4 border ${
            myBalance.amount > 0
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <p className="text-sm font-medium mb-1 text-slate-300">رصيدك في المجموعة</p>
            <p className={`text-2xl font-bold ${myBalance.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {myBalance.amount > 0 ? '+' : ''}{myBalance.amount.toFixed(2)} {symbol}
            </p>
            {myTransfers.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {myBalance.amount > 0
                  ? `${myTransfers.filter(t => t.to === user?.uid).length} شخص يدين لك`
                  : `تحتاج لدفع ${myTransfers.filter(t => t.from === user?.uid).length} شخص`}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl mb-6 overflow-x-auto scrollbar-none">
          {([
            { key: 'expenses', label: 'المصاريف', icon: Receipt },
            { key: 'balances', label: 'الأرصدة', icon: Users },
            { key: 'settlements', label: 'التسويات', icon: ArrowLeftRight },
            { key: 'activity', label: 'النشاط', icon: Activity },
            { key: 'stats', label: 'إحصائيات', icon: BarChart3 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                tab === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'expenses' && <ExpenseList />}

        {tab === 'balances' && (
          <div className="space-y-3">
            {balances.length === 0 || balances.every(b => Math.abs(b.amount) < 0.01) ? (
              <EmptyState icon={Users} title="جميع الأرصدة مسوّاة" description="لا يوجد ديون حالياً في المجموعة" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">
                    {simplify ? 'تبسيط الديون: مفعّل' : 'تبسيط الديون: معطّل'}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      تغيير
                    </button>
                  )}
                </div>
                {new Set(expenses.map(e => e.currency || group.currency)).size > 1 && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                    تحتوي المجموعة على مصاريف بعملات مختلفة — الأرصدة المعروضة تجمع كل العملات بدون تحويل
                  </div>
                )}
                {balancesPage.visible.map(b => {
                  const isSelected = selectedBalance === b.uid;
                  const owes = transfers.filter(t => t.from === b.uid);
                  const owedBy = transfers.filter(t => t.to === b.uid);
                  const hasDetail = owes.length > 0 || owedBy.length > 0;
                  return (
                    <div key={b.uid}>
                      <button
                        onClick={() => setSelectedBalance(isSelected ? null : b.uid)}
                        className={`card p-4 flex items-center gap-3 w-full text-right transition-colors ${hasDetail ? 'hover:bg-slate-800/60 cursor-pointer' : 'cursor-default'} ${isSelected ? 'ring-1 ring-slate-600' : ''}`}
                      >
                        <Avatar uid={b.uid} name={b.displayName} photoURL={b.photoURL} size="md" />
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">
                            {b.uid === user?.uid ? 'أنت' : getNickname(b.uid, b.displayName)}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {Math.abs(b.amount) < 0.01 ? 'مسوّى' : b.amount > 0 ? 'يستحق' : 'مدين'}
                            {hasDetail && <span className="mr-1 text-slate-600">· اضغط للتفاصيل</span>}
                          </p>
                        </div>
                        <span className={`font-bold ${
                          Math.abs(b.amount) < 0.01 ? 'text-slate-500' :
                          b.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {Math.abs(b.amount) < 0.01 ? '0.00' : (b.amount > 0 ? '+' : '')}{b.amount.toFixed(2)} {symbol}
                        </span>
                      </button>
                      {isSelected && hasDetail && (
                        <div className="mx-2 bg-slate-900 border border-slate-700 border-t-0 rounded-b-xl px-4 py-3 space-y-2">
                          {owes.map((t, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Avatar uid={t.to} name={t.toName} photoURL={t.toPhoto} size="xs" />
                              <span className="text-slate-400 text-xs flex-1">
                                يدفع لـ <span className="text-white font-medium">{t.to === user?.uid ? 'أنت' : getNickname(t.to, t.toName)}</span>
                              </span>
                              <span className="text-red-400 text-xs font-bold">{t.amount.toFixed(2)} {symbol}</span>
                            </div>
                          ))}
                          {owedBy.map((t, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Avatar uid={t.from} name={t.fromName} photoURL={t.fromPhoto} size="xs" />
                              <span className="text-slate-400 text-xs flex-1">
                                <span className="text-white font-medium">{t.from === user?.uid ? 'أنت' : getNickname(t.from, t.fromName)}</span> يستلم من
                              </span>
                              <span className="text-emerald-400 text-xs font-bold">{t.amount.toFixed(2)} {symbol}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {balancesPage.hasMore && (
                  <div ref={balancesPage.sentinelRef} className="py-3 flex justify-center">
                    <button
                      onClick={balancesPage.loadMore}
                      className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      عرض المزيد ({balancesPage.remaining})
                    </button>
                  </div>
                )}
                {transfers.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-slate-400 text-sm font-medium mb-3">التحويلات المقترحة</h3>
                    <div className="space-y-2">
                      {balanceTransfersPage.visible.map((t, i) => (
                        <div key={i} className="card p-4 flex items-center gap-3">
                          <Avatar uid={t.from} name={t.fromName} photoURL={t.fromPhoto} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">
                              <span className="font-medium">{t.from === user?.uid ? 'أنت' : getNickname(t.from, t.fromName)}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="font-medium">{t.to === user?.uid ? 'أنت' : getNickname(t.to, t.toName)}</span>
                            </p>
                          </div>
                          <Avatar uid={t.to} name={t.toName} photoURL={t.toPhoto} size="sm" />
                          <span className="font-bold text-emerald-400 mr-2">{t.amount.toFixed(2)} {symbol}</span>
                        </div>
                      ))}
                    </div>
                    {balanceTransfersPage.hasMore && (
                      <div ref={balanceTransfersPage.sentinelRef} className="py-3 flex justify-center">
                        <button
                          onClick={balanceTransfersPage.loadMore}
                          className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          عرض المزيد ({balanceTransfersPage.remaining})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'settlements' && <SettlementsView transfers={transfers} />}

        {tab === 'activity' && <ActivityFeed />}

        {tab === 'stats' && <GroupStats />}
      </div>

      {showAddExpense && (
        <ExpenseFormModal
          onClose={() => setShowAddExpense(false)}
          defaultCurrency={group.currency}
        />
      )}
      {showSettings && (
        <GroupSettingsModal
          group={group}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
