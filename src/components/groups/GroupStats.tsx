import { TrendingUp, Receipt, PieChart, Calendar } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getCurrency } from '../../lib/currencies';
import { getExpenseCategory } from '../../lib/categories';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';

export function GroupStats() {
  const { expenses, members, groups, currentGroupId } = useStore();
  const group = groups.find(g => g.id === currentGroupId);
  const groupCurrency = group?.currency || 'USD';
  const symbol = getCurrency(groupCurrency).symbol;

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="لا توجد إحصائيات بعد"
        description="أضف مصاريف لترى التحليلات والملخصات"
      />
    );
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const avg = total / expenses.length;

  // by category
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const id = e.category || 'other';
    byCategory[id] = (byCategory[id] || 0) + e.amount;
  }
  const categoryRows = Object.entries(byCategory)
    .map(([id, amount]) => ({ id, amount, cat: getExpenseCategory(id) }))
    .sort((a, b) => b.amount - a.amount);

  // by member (who paid)
  const byPayer: Record<string, number> = {};
  for (const e of expenses) {
    byPayer[e.paidBy] = (byPayer[e.paidBy] || 0) + e.amount;
  }
  const payerRows = Object.entries(byPayer)
    .map(([uid, amount]) => {
      const member = members.find(m => m.uid === uid);
      return { uid, amount, member };
    })
    .sort((a, b) => b.amount - a.amount);

  // by month (last 6)
  const byMonth: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.date.slice(0, 7); // YYYY-MM
    byMonth[key] = (byMonth[key] || 0) + e.amount;
  }
  const monthRows = Object.entries(byMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);

  const monthMax = Math.max(...monthRows.map(([, v]) => v), 1);

  return (
    <div className="space-y-6 pb-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <Receipt size={14} />
            <span>إجمالي المصاريف</span>
          </div>
          <p className="text-white font-bold text-xl">{total.toFixed(2)} <span className="text-slate-500 text-sm font-normal">{symbol}</span></p>
          <p className="text-slate-500 text-xs mt-1">{expenses.length} مصروف</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            <TrendingUp size={14} />
            <span>متوسط المصروف</span>
          </div>
          <p className="text-white font-bold text-xl">{avg.toFixed(2)} <span className="text-slate-500 text-sm font-normal">{symbol}</span></p>
          <p className="text-slate-500 text-xs mt-1">للمصروف الواحد</p>
        </div>
      </div>

      {/* By category */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="text-slate-400" size={16} />
          <h3 className="text-slate-300 font-semibold">حسب الفئة</h3>
        </div>
        <div className="card p-4 space-y-3">
          {categoryRows.map(({ id, amount, cat }) => {
            const Icon = cat.icon;
            const pct = (amount / total) * 100;
            return (
              <div key={id}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                    <Icon size={13} className={cat.color} />
                  </div>
                  <span className="text-slate-300 text-sm flex-1">{cat.labelAr}</span>
                  <span className="text-white text-sm font-medium">{amount.toFixed(2)} {symbol}</span>
                  <span className="text-slate-500 text-xs w-12 text-left">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.bg.replace('/10', '/60')} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By payer */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="text-slate-400" size={16} />
          <h3 className="text-slate-300 font-semibold">من دفع أكثر</h3>
        </div>
        <div className="card p-4 space-y-3">
          {payerRows.map(({ uid, amount, member }) => {
            const pct = (amount / total) * 100;
            return (
              <div key={uid} className="flex items-center gap-3">
                <Avatar
                  uid={uid}
                  name={member?.displayName || '؟'}
                  photoURL={member?.photoURL}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">
                    {member?.displayName || 'عضو سابق'}
                  </p>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-emerald-500/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{amount.toFixed(2)} {symbol}</p>
                  <p className="text-slate-500 text-xs">{pct.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By month */}
      {monthRows.length > 1 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-slate-400" size={16} />
            <h3 className="text-slate-300 font-semibold">آخر الأشهر</h3>
          </div>
          <div className="card p-4 space-y-2.5">
            {monthRows.map(([month, amount]) => {
              const pct = (amount / monthMax) * 100;
              const [y, m] = month.split('-');
              const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                                  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
              const label = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-20 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-white text-sm font-medium w-24 text-left">{amount.toFixed(2)} {symbol}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
