import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Plus, Receipt, Home, MoreHorizontal,
  Copy, Trash2, LogOut, Download, MoreVertical, Settings, Activity, BarChart3, History,
  CheckCircle, ArrowLeftRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { calculateBalances, calculateMinTransfers, calculateDirectDebts } from '../../lib/calculations';
import { getCurrency } from '../../lib/currencies';
import { ExpenseList } from '../expenses/ExpenseList';
import { ExpenseFormModal } from '../expenses/ExpenseFormModal';
import { ExpenseCard } from '../expenses/ExpenseCard';
import { SettlementsView } from '../settlements/SettlementsView';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { GroupSettingsModal } from './GroupSettingsModal';
import { ActivityFeed } from '../activity/ActivityFeed';
import { GroupStats } from './GroupStats';
import { getGroupCategory } from '../../lib/categories';
import { confirmAction } from '../../store/useConfirm';
import { useNickname } from '../../hooks/useNickname';
import { Expense } from '../../types';

type Tab = 'home' | 'expenses' | 'more';
type MoreSubTab = 'activity' | 'stats' | 'history';

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, groups, members, expenses, settlements, setCurrentGroupId, addToast, cacheGroupBalance } = useStore();
  const { createInvite, deleteGroup, leaveGroup } = useGroups();
  const { exportBackup, addSettlement, deleteExpense } = useExpenses();
  const [tab, setTab] = useState<Tab>('home');
  const [moreTab, setMoreTab] = useState<MoreSubTab>('activity');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
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
  const canSettle = isOwner || group.permissions?.membersCanSettle !== false;
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

  const myBalance = balances.find(b => b.uid === user?.uid);
  const myDebts = transfers.filter(t => t.from === user?.uid);
  const myCredits = transfers.filter(t => t.to === user?.uid);

  // Cache user's balance for Dashboard display
  useEffect(() => {
    if (user && group && myBalance) {
      cacheGroupBalance(group.id, myBalance.amount, group.currency);
    }
  }, [user, group?.id, group?.currency, myBalance?.amount]);

  const handleQuickSettle = async (transfer: typeof transfers[number]) => {
    const key = `${transfer.from}-${transfer.to}`;
    const targetName = transfer.to === user?.uid
      ? getNickname(transfer.from, transfer.fromName)
      : getNickname(transfer.to, transfer.toName);
    const ok = await confirmAction({
      title: 'تأكيد الدفعة',
      description: `سجّل دفعة بمبلغ ${transfer.amount.toFixed(2)} ${symbol} ${transfer.from === user?.uid ? `لـ ${targetName}` : `من ${targetName}`}؟`,
      confirmLabel: 'تأكيد',
    });
    if (!ok) return;
    setSettlingKey(key);
    await addSettlement({
      from: transfer.from,
      fromName: transfer.fromName,
      fromPhoto: transfer.fromPhoto,
      to: transfer.to,
      toName: transfer.toName,
      toPhoto: transfer.toPhoto,
      amount: transfer.amount,
      currency: group.currency,
    });
    setSettlingKey(null);
  };

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

  const canEditExpense = (e: Expense) => isOwner || e.paidBy === user?.uid || e.createdBy === user?.uid;

  const handleDeleteExpense = async (e: Expense) => {
    const ok = await confirmAction({
      title: 'حذف المصروف؟',
      description: `سيتم حذف "${e.title}" بشكل نهائي.`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    deleteExpense(e.id);
  };

  // Recent 5 expenses sorted newest first
  const recentExpenses = [...expenses]
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1;
    })
    .slice(0, 5);

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
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleCopyInvite}
              aria-label="دعوة عضو"
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
            >
              <Copy size={18} />
            </button>
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

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl mb-5">
          {([
            { key: 'home', label: 'الرئيسية', icon: Home },
            { key: 'expenses', label: 'المصاريف', icon: Receipt },
            { key: 'more', label: 'المزيد', icon: MoreHorizontal },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'home' && (
          <div className="space-y-5">
            {/* My balance card */}
            {myBalance && Math.abs(myBalance.amount) > 0.01 ? (
              <div className={`rounded-2xl p-4 border ${
                myBalance.amount > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <p className="text-sm font-medium mb-1 text-slate-300">رصيدك في المجموعة</p>
                <p className={`text-2xl font-bold ${myBalance.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {myBalance.amount > 0 ? '+' : ''}{myBalance.amount.toFixed(2)} {symbol}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {myBalance.amount > 0
                    ? `${myCredits.length} شخص يدين لك`
                    : `تحتاج لدفع ${myDebts.length} شخص`}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl p-4 border bg-slate-900 border-slate-800">
                <p className="text-emerald-400 font-bold flex items-center gap-2">
                  <CheckCircle size={18} />
                  جميع أرصدتك مسوّاة
                </p>
              </div>
            )}

            {/* Quick pay buttons for my debts */}
            {canSettle && myDebts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-slate-400 text-xs font-medium">دفعات مقترحة</h3>
                {myDebts.map((t) => {
                  const key = `${t.from}-${t.to}`;
                  return (
                    <button
                      key={key}
                      onClick={() => handleQuickSettle(t)}
                      disabled={settlingKey === key}
                      className="w-full card p-3 flex items-center gap-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors text-right disabled:opacity-50"
                    >
                      <Avatar uid={t.to} name={t.toName} photoURL={t.toPhoto} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">
                          ادفع لـ <span className="font-medium">{getNickname(t.to, t.toName)}</span>
                        </p>
                        <p className="text-red-400 font-bold text-base">{t.amount.toFixed(2)} {symbol}</p>
                      </div>
                      {settlingKey === key
                        ? <LoadingSpinner size="sm" />
                        : <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Credits owed to me */}
            {myCredits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-slate-400 text-xs font-medium">يدينون لك</h3>
                {myCredits.map((t, i) => (
                  <div key={i} className="card p-3 flex items-center gap-3">
                    <Avatar uid={t.from} name={t.fromName} photoURL={t.fromPhoto} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-medium">{getNickname(t.from, t.fromName)}</span> يدين لك
                      </p>
                    </div>
                    <span className="font-bold text-emerald-400 flex-shrink-0">{t.amount.toFixed(2)} {symbol}</span>
                  </div>
                ))}
              </div>
            )}

            {/* All members balances */}
            {balances.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-slate-400 text-xs font-medium">أرصدة الأعضاء</h3>
                <div className="card divide-y divide-slate-800">
                  {balances.map((b) => {
                    const isSettled = Math.abs(b.amount) < 0.01;
                    const isPositive = b.amount > 0.01;
                    return (
                      <div key={b.uid} className="flex items-center gap-3 p-3">
                        <Avatar uid={b.uid} name={b.displayName} photoURL={b.photoURL} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {b.uid === user?.uid ? 'أنت' : getNickname(b.uid, b.displayName)}
                          </p>
                          <p className={`text-xs mt-0.5 ${isSettled ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isSettled ? 'مسوّى' : isPositive ? 'دائن' : 'مدين'}
                          </p>
                        </div>
                        <span className={`font-bold text-sm flex-shrink-0 ${isSettled ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isSettled ? '—' : `${isPositive ? '+' : ''}${b.amount.toFixed(2)} ${symbol}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent expenses preview */}
            {recentExpenses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-400 text-xs font-medium">آخر المصاريف</h3>
                  <button
                    onClick={() => setTab('expenses')}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors"
                  >
                    عرض الكل ({expenses.length})
                  </button>
                </div>
                {recentExpenses.map((e) => (
                  <ExpenseCard
                    key={e.id}
                    expense={e}
                    user={user}
                    members={members}
                    defaultCurrency={group.currency}
                    canEdit={canEditExpense(e)}
                    getNickname={getNickname}
                    onEdit={setEditingExpense}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {expenses.length === 0 && (!myBalance || Math.abs(myBalance.amount) < 0.01) && (
              <EmptyState
                icon={Receipt}
                title="ابدأ بإضافة مصروف"
                description="سجّل أول مصروف للمجموعة لرؤية الأرصدة والديون"
                action={canAddExpense ? { label: 'إضافة مصروف', onClick: () => setShowAddExpense(true) } : undefined}
              />
            )}
          </div>
        )}

        {tab === 'expenses' && <ExpenseList />}

        {tab === 'more' && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {([
                { key: 'activity', label: 'النشاط', icon: Activity },
                { key: 'history', label: 'سجل التسويات', icon: History },
                { key: 'stats', label: 'إحصائيات', icon: BarChart3 },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMoreTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    moreTab === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {moreTab === 'activity' && <ActivityFeed />}
            {moreTab === 'stats' && <GroupStats />}
            {moreTab === 'history' && <SettlementsView transfers={transfers} />}

            {moreTab === 'history' && transfers.length === 0 && settlements.length === 0 && (
              <EmptyState
                icon={ArrowLeftRight}
                title="لا توجد تسويات بعد"
                description="ستظهر هنا التسويات المقترحة وسجل الدفعات السابقة"
              />
            )}
          </div>
        )}
      </div>

      {showAddExpense && (
        <ExpenseFormModal
          onClose={() => setShowAddExpense(false)}
          defaultCurrency={group.currency}
        />
      )}
      {editingExpense && (
        <ExpenseFormModal
          expense={editingExpense}
          defaultCurrency={group.currency}
          onClose={() => setEditingExpense(null)}
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
