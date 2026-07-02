import { useState } from 'react';
import { Plus, LogOut, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { logout } from '../../lib/actions';
import { GroupCard } from '../groups/GroupCard';
import { CreateGroupModal } from '../groups/CreateGroupModal';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { GroupCardSkeleton } from '../ui/Skeleton';
import { SettingsMenu } from '../ui/SettingsMenu';

export function Dashboard() {
  const { user, groups, groupsLoaded, groupBalanceCache } = useStore();
  const [showCreate, setShowCreate] = useState(false);

  // Aggregate by currency (groups can have different currencies)
  const totals: Record<string, { credit: number; debt: number }> = {};
  for (const g of groups) {
    const cache = groupBalanceCache[g.id];
    if (!cache) continue;
    const cur = cache.currency || g.currency;
    if (!totals[cur]) totals[cur] = { credit: 0, debt: 0 };
    if (cache.amount > 0.01) totals[cur].credit += cache.amount;
    else if (cache.amount < -0.01) totals[cur].debt += Math.abs(cache.amount);
  }
  const currencies = Object.keys(totals);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💸</span>
            <h1 className="text-xl font-bold text-white">مصلاوية</h1>
          </div>
          <div className="flex items-center gap-1">
            <SettingsMenu />
            {user && (
              <Avatar uid={user.uid} name={user.displayName} photoURL={user.photoURL} size="sm" className="ring-2 ring-slate-700" />
            )}
            <button
              onClick={logout}
              aria-label="تسجيل خروج"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {currencies.length > 0 && (
          <div className="mb-6 grid gap-3">
            {currencies.map(cur => {
              const { credit, debt } = totals[cur];
              const net = credit - debt;
              return (
                <div key={cur} className="card p-4">
                  <p className="text-slate-400 text-xs mb-2">صافي رصيدك {currencies.length > 1 ? `(${cur})` : ''}</p>
                  <p className={`text-2xl font-bold ${
                    Math.abs(net) < 0.01 ? 'text-slate-300' : net > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {Math.abs(net) < 0.01 ? 'مسوّى' : `${net > 0 ? '+' : ''}${net.toFixed(2)} ${cur}`}
                  </p>
                  {(credit > 0.01 || debt > 0.01) && (
                    <div className="flex gap-4 mt-2 text-xs">
                      {credit > 0.01 && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <TrendingUp size={12} />
                          يستحقّ لك {credit.toFixed(2)}
                        </span>
                      )}
                      {debt > 0.01 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <TrendingDown size={12} />
                          عليك {debt.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">مجموعاتي</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {!groupsLoaded ? '...' : groups.length === 0 ? 'لا توجد مجموعات بعد' : `${groups.length} مجموعة`}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            مجموعة جديدة
          </button>
        </div>

        {!groupsLoaded ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="لا توجد مجموعات"
            description="أنشئ مجموعة جديدة أو انضم إلى مجموعة موجودة برمز الدعوة"
            action={{ label: 'إنشاء مجموعة', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
