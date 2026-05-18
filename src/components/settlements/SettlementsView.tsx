import { useState } from 'react';
import { ArrowLeftRight, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { useExpenses } from '../../hooks/useExpenses';
import { Transfer } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Props { transfers: Transfer[]; }

export function SettlementsView({ transfers }: Props) {
  const { user, settlements } = useStore();
  const { addSettlement } = useExpenses();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSettle = async (t: Transfer) => {
    const key = `${t.from}-${t.to}`;
    setLoading(key);
    await addSettlement({
      from: t.from,
      fromName: t.fromName,
      fromPhoto: t.fromPhoto,
      to: t.to,
      toName: t.toName,
      toPhoto: t.toPhoto,
      amount: t.amount,
    });
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      {transfers.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-sm font-medium mb-3">تسويات مقترحة</h3>
          <div className="space-y-2">
            {transfers.map((t, i) => {
              const key = `${t.from}-${t.to}`;
              const isMe = t.from === user?.uid || t.to === user?.uid;
              return (
                <div
                  key={i}
                  className={`card p-4 flex items-center gap-3 ${isMe ? 'border-emerald-500/20' : ''}`}
                >
                  <img src={t.fromPhoto} alt={t.fromName} className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-medium">{t.from === user?.uid ? 'أنت' : t.fromName}</span>
                      <span className="text-slate-400"> → </span>
                      <span className="font-medium">{t.to === user?.uid ? 'أنت' : t.toName}</span>
                    </p>
                    <p className="text-emerald-400 font-bold text-sm">{t.amount.toFixed(2)} $</p>
                  </div>
                  <img src={t.toPhoto} alt={t.toName} className="w-9 h-9 rounded-full flex-shrink-0" />
                  {t.from === user?.uid && (
                    <button
                      onClick={() => handleSettle(t)}
                      disabled={loading === key}
                      className="btn-primary text-xs flex items-center gap-1.5 flex-shrink-0"
                    >
                      {loading === key
                        ? <LoadingSpinner size="sm" />
                        : <><CheckCircle size={13} /> سدّدت</>
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {settlements.length === 0 && transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="لا توجد تسويات"
          description="ستظهر هنا التسويات المقترحة بمجرد إضافة مصاريف"
        />
      ) : settlements.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-sm font-medium mb-3">سجل التسويات</h3>
          <div className="space-y-2">
            {settlements.map(s => (
              <div key={s.id} className="card p-4 flex items-center gap-3 opacity-75">
                <img src={s.fromPhoto} alt={s.fromName} className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm">
                    <span className="font-medium">{s.from === user?.uid ? 'أنت' : s.fromName}</span>
                    <span className="text-slate-500"> سدّد لـ </span>
                    <span className="font-medium">{s.to === user?.uid ? 'أنت' : s.toName}</span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    {format(new Date(s.settledAt), 'dd MMM yyyy', { locale: ar })}
                  </p>
                </div>
                <span className="text-slate-400 font-medium">{s.amount.toFixed(2)} $</span>
                <CheckCircle className="text-emerald-500 flex-shrink-0" size={16} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
