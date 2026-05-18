import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Plus, Users, Receipt, ArrowLeftRight,
  Copy, Trash2, LogOut, Download, MoreVertical, Settings,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { calculateBalances, calculateMinTransfers } from '../../lib/calculations';
import { getCurrency } from '../../lib/currencies';
import { ExpenseList } from '../expenses/ExpenseList';
import { ExpenseFormModal } from '../expenses/ExpenseFormModal';
import { SettlementsView } from '../settlements/SettlementsView';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { GroupSettingsModal } from './GroupSettingsModal';

type Tab = 'expenses' | 'balances' | 'settlements';

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, groups, members, expenses, settlements, setCurrentGroupId, addToast } = useStore();
  const { createInvite, deleteGroup, leaveGroup } = useGroups();
  const { exportBackup } = useExpenses();
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
  const symbol = getCurrency(group.currency).symbol;
  const settlementsData = settlements.map(s => ({ from: s.from, to: s.to, amount: s.amount }));
  const balances = calculateBalances(expenses, settlementsData, members);
  const transfers = calculateMinTransfers(balances);

  const handleCopyInvite = async () => {
    const code = await createInvite(group.id, group.name);
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        addToast(`رمز الدعوة: ${code} — تم النسخ!`, 'success');
      } catch {
        addToast(`رمز الدعوة: ${code}`, 'info');
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل تريد حذف المجموعة؟ لا يمكن التراجع.')) return;
    await deleteGroup(group.id);
    navigate('/');
  };

  const handleLeave = async () => {
    if (!confirm('هل تريد مغادرة المجموعة؟')) return;
    await leaveGroup(group.id);
    navigate('/');
  };

  const myBalance = balances.find(b => b.uid === user?.uid);
  const myTransfers = transfers.filter(t => t.from === user?.uid || t.to === user?.uid);

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
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{group.name}</h1>
              <p className="text-slate-500 text-xs">{members.length} أعضاء · {group.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAddExpense(true)}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Plus size={16} />
              مصروف
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <MoreVertical size={20} />
              </button>
              {showMenu && (
                <div className="absolute left-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl min-w-[200px] z-40 overflow-hidden">
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
        <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl mb-6">
          {([
            { key: 'expenses', label: 'المصاريف', icon: Receipt },
            { key: 'balances', label: 'الأرصدة', icon: Users },
            { key: 'settlements', label: 'التسويات', icon: ArrowLeftRight },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              balances.map(b => (
                <div key={b.uid} className="card p-4 flex items-center gap-3">
                  <Avatar uid={b.uid} name={b.displayName} photoURL={b.photoURL} size="md" />
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {b.uid === user?.uid ? 'أنت' : b.displayName}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {Math.abs(b.amount) < 0.01 ? 'مسوّى' : b.amount > 0 ? 'يستحق' : 'مدين'}
                    </p>
                  </div>
                  <span className={`font-bold ${
                    Math.abs(b.amount) < 0.01 ? 'text-slate-500' :
                    b.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {Math.abs(b.amount) < 0.01 ? '0.00' : (b.amount > 0 ? '+' : '')}{b.amount.toFixed(2)} {symbol}
                  </span>
                </div>
              ))
            )}
            {transfers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-slate-400 text-sm font-medium mb-3">التحويلات المقترحة</h3>
                <div className="space-y-2">
                  {transfers.map((t, i) => (
                    <div key={i} className="card p-4 flex items-center gap-3">
                      <Avatar uid={t.from} name={t.fromName} photoURL={t.fromPhoto} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">
                          <span className="font-medium">{t.from === user?.uid ? 'أنت' : t.fromName}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="font-medium">{t.to === user?.uid ? 'أنت' : t.toName}</span>
                        </p>
                      </div>
                      <Avatar uid={t.to} name={t.toName} photoURL={t.toPhoto} size="sm" />
                      <span className="font-bold text-emerald-400 mr-2">{t.amount.toFixed(2)} {symbol}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'settlements' && <SettlementsView transfers={transfers} />}
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
      {showMenu && <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />}
    </div>
  );
}
