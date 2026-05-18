import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Activity, Plus, Pencil, Trash2, ArrowLeftRight,
  UserPlus, UserMinus, LogOut, Settings, Star,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getCurrency } from '../../lib/currencies';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { usePagination } from '../../hooks/usePagination';
import { ActivityLogEntry, ActivityAction } from '../../types';

function ActionIcon({ action }: { action: ActivityAction }) {
  const cfg: Record<ActivityAction, { icon: React.ElementType; bg: string; color: string }> = {
    expense_added:          { icon: Plus,            bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
    expense_edited:         { icon: Pencil,          bg: 'bg-amber-500/10',   color: 'text-amber-400'   },
    expense_deleted:        { icon: Trash2,          bg: 'bg-red-500/10',     color: 'text-red-400'     },
    settlement_added:       { icon: ArrowLeftRight,  bg: 'bg-blue-500/10',    color: 'text-blue-400'    },
    settlement_deleted:     { icon: Trash2,          bg: 'bg-red-500/10',     color: 'text-red-400'     },
    member_joined:          { icon: UserPlus,        bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
    member_left:            { icon: LogOut,          bg: 'bg-slate-500/10',   color: 'text-slate-400'   },
    member_removed:         { icon: UserMinus,       bg: 'bg-red-500/10',     color: 'text-red-400'     },
    group_settings_changed: { icon: Settings,        bg: 'bg-slate-500/10',   color: 'text-slate-400'   },
    group_created:          { icon: Star,            bg: 'bg-amber-500/10',   color: 'text-amber-400'   },
  };
  const { icon: Icon, bg, color } = cfg[action] ?? { icon: Activity, bg: 'bg-slate-500/10', color: 'text-slate-400' };
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
      <Icon size={16} className={color} />
    </div>
  );
}

function actionLabel(entry: ActivityLogEntry, myUid: string | undefined): { primary: string; secondary?: string } {
  const me = entry.actorId === myUid;
  const actor = me ? 'أنت' : entry.actorName;
  const sym = entry.currency ? getCurrency(entry.currency).symbol : '';

  switch (entry.action) {
    case 'expense_added':
      return {
        primary: `${actor} أضاف${me ? 'ت' : ''} مصروف "${entry.targetName}"`,
        secondary: entry.amount ? `${entry.amount.toFixed(2)} ${sym}` : undefined,
      };
    case 'expense_edited':
      return {
        primary: `${actor} عدّل${me ? 'ت' : ''} مصروف "${entry.targetName}"`,
        secondary: entry.amount ? `${entry.amount.toFixed(2)} ${sym}` : undefined,
      };
    case 'expense_deleted':
      return {
        primary: `${actor} حذف${me ? 'ت' : ''} مصروف "${entry.targetName}"`,
        secondary: entry.amount ? `${entry.amount.toFixed(2)} ${sym}` : undefined,
      };
    case 'settlement_added':
      return {
        primary: `${actor} سجّل${me ? 'ت' : ''} تسوية إلى ${entry.extraInfo || ''}`,
        secondary: entry.amount ? `${entry.amount.toFixed(2)} ${sym}` : undefined,
      };
    case 'settlement_deleted':
      return {
        primary: `${actor} حذف${me ? 'ت' : ''} تسوية مع ${entry.extraInfo || ''}`,
        secondary: entry.amount ? `${entry.amount.toFixed(2)} ${sym}` : undefined,
      };
    case 'member_joined':
      return { primary: `${actor} انضم${me ? 'ت' : ''} إلى المجموعة` };
    case 'member_left':
      return { primary: `${actor} غادر${me ? 'ت' : ''} المجموعة` };
    case 'member_removed':
      return { primary: `${actor} أزال${me ? 'ت' : ''} ${entry.targetName || 'عضو'} من المجموعة` };
    case 'group_settings_changed':
      return { primary: `${actor} عدّل${me ? 'ت' : ''} ${entry.extraInfo || 'إعدادات المجموعة'}` };
    case 'group_created':
      return { primary: `${actor} أنشأ${me ? 'ت' : ''} المجموعة` };
    default:
      return { primary: actor };
  }
}

export function ActivityFeed() {
  const { activityLogs, user, currentGroupId } = useStore();
  const { visible, hasMore, loadMore, sentinelRef, remaining } = usePagination(activityLogs, 15, currentGroupId);

  if (activityLogs.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="لا يوجد نشاط بعد"
        description="ستظهر هنا جميع العمليات في المجموعة"
      />
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((entry: ActivityLogEntry) => {
        const { primary, secondary } = actionLabel(entry, user?.uid);
        return (
          <div key={entry.id} className="card p-3 flex items-start gap-3">
            <ActionIcon action={entry.action} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <Avatar uid={entry.actorId} name={entry.actorName} photoURL={entry.actorPhoto} size="xs" />
                <p className="text-slate-200 text-sm leading-snug flex-1">{primary}</p>
              </div>
              <p className="text-slate-600 text-xs mt-1 mr-7">
                {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: ar })}
              </p>
            </div>
            {secondary && (
              <span className={`text-sm font-bold flex-shrink-0 ${
                entry.action === 'expense_deleted' || entry.action === 'settlement_deleted'
                  ? 'text-red-400'
                  : entry.action === 'settlement_added'
                  ? 'text-blue-400'
                  : 'text-slate-300'
              }`}>
                {secondary}
              </span>
            )}
          </div>
        );
      })}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          <button
            onClick={loadMore}
            className="text-slate-400 hover:text-slate-200 text-xs font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            عرض المزيد ({remaining})
          </button>
        </div>
      )}
    </div>
  );
}
