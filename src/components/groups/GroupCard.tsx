import { ChevronLeft, Users } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Group } from '../../types';
import { useNavigate } from 'react-router-dom';

export function GroupCard({ group }: { group: Group }) {
  const { setCurrentGroupId } = useStore();
  const navigate = useNavigate();

  const handleOpen = () => {
    setCurrentGroupId(group.id);
    navigate(`/group/${group.id}`);
  };

  return (
    <button
      onClick={handleOpen}
      className="card w-full p-4 flex items-center gap-4 hover:border-slate-600 transition-all text-left rtl:text-right group"
    >
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <Users className="text-emerald-400" size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold truncate">{group.name}</h3>
        <p className="text-slate-500 text-sm mt-0.5">
          {group.memberCount} {group.memberCount === 1 ? 'عضو' : 'أعضاء'}
        </p>
      </div>
      <ChevronLeft className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" size={20} />
    </button>
  );
}
