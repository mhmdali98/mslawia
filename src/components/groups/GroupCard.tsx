import { ChevronLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Group } from '../../types';
import { useNavigate } from 'react-router-dom';
import { getGroupCategory } from '../../lib/categories';
import { getCurrency } from '../../lib/currencies';

export function GroupCard({ group }: { group: Group }) {
  const { setCurrentGroupId, groupBalanceCache } = useStore();
  const navigate = useNavigate();
  const cat = getGroupCategory(group.category);
  const CatIcon = cat.icon;
  const cached = groupBalanceCache[group.id];
  const symbol = getCurrency(cached?.currency || group.currency).symbol;

  const handleOpen = () => {
    setCurrentGroupId(group.id);
    navigate(`/group/${group.id}`);
  };

  const balance = cached?.amount;
  const isSettled = balance !== undefined && Math.abs(balance) < 0.01;
  const isPositive = balance !== undefined && balance > 0.01;
  const isNegative = balance !== undefined && balance < -0.01;

  return (
    <button
      onClick={handleOpen}
      className="card w-full p-4 flex items-center gap-4 hover:border-slate-600 transition-all text-left rtl:text-right group"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
        <CatIcon className={cat.color} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold truncate">{group.name}</h3>
        <p className="text-slate-500 text-sm mt-0.5 truncate">
          {group.memberCount} {group.memberCount === 1 ? 'عضو' : 'أعضاء'}
          {balance === undefined && group.description && <span className="text-slate-600"> · {group.description}</span>}
        </p>
        {balance !== undefined && (
          <p className={`text-xs font-bold mt-1 ${
            isSettled ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isSettled ? 'مسوّى' :
             isPositive ? `يستحقّ لك ${balance.toFixed(2)} ${symbol}` :
             isNegative ? `عليك ${Math.abs(balance).toFixed(2)} ${symbol}` : ''}
          </p>
        )}
      </div>
      <ChevronLeft className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" size={20} />
    </button>
  );
}
