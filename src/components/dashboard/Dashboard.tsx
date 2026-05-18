import { useState } from 'react';
import { Plus, LogOut, Users } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useT } from '../../lib/i18n';
import { GroupCard } from '../groups/GroupCard';
import { CreateGroupModal } from '../groups/CreateGroupModal';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { GroupCardSkeleton } from '../ui/Skeleton';
import { SettingsMenu } from '../ui/SettingsMenu';

export function Dashboard() {
  const { user, groups, groupsLoaded } = useStore();
  const { logout } = useAuth();
  const t = useT();
  useGroups();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💸</span>
            <h1 className="text-xl font-bold text-white">{t('appName')}</h1>
          </div>
          <div className="flex items-center gap-1">
            <SettingsMenu />
            {user && (
              <Avatar uid={user.uid} name={user.displayName} photoURL={user.photoURL} size="sm" className="ring-2 ring-slate-700" />
            )}
            <button
              onClick={logout}
              aria-label={t('logout')}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('myGroups')}</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {!groupsLoaded ? '...' : groups.length === 0 ? t('noGroupsYet') : `${groups.length} ${groups.length === 1 ? t('group') : t('group')}`}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            {t('newGroup')}
          </button>
        </div>

        {!groupsLoaded ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('noGroups')}
            description={t('noGroupsDesc')}
            action={{ label: t('createGroupAction'), onClick: () => setShowCreate(true) }}
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
