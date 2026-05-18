import { useState } from 'react';
import { Plus, LogOut, Users } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { GroupCard } from '../groups/GroupCard';
import { CreateGroupModal } from '../groups/CreateGroupModal';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';

export function Dashboard() {
  const { user, groups } = useStore();
  const { logout } = useAuth();
  useGroups();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💸</span>
            <h1 className="text-xl font-bold text-white">مصاريا</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Avatar uid={user.uid} name={user.displayName} photoURL={user.photoURL} size="sm" className="ring-2 ring-slate-700" />
            )}
            <button
              onClick={logout}
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
            <h2 className="text-2xl font-bold text-white">مجموعاتي</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {groups.length === 0 ? 'لا توجد مجموعات بعد' : `${groups.length} مجموعة`}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            مجموعة جديدة
          </button>
        </div>

        {groups.length === 0 ? (
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
