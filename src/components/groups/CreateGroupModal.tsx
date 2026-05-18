import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useGroups } from '../../hooks/useGroups';
import { useStore } from '../../store/useStore';
import { CURRENCIES } from '../../lib/currencies';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Props { onClose: () => void; }

export function CreateGroupModal({ onClose }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { createGroup, joinByInvite } = useGroups();
  const { addToast } = useStore();

  const handleCreate = async () => {
    if (!name.trim()) { addToast('أدخل اسم المجموعة.', 'error'); return; }
    setLoading(true);
    await createGroup(name.trim(), description.trim(), currency);
    setLoading(false);
    onClose();
  };

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) { addToast('أدخل رمز الدعوة.', 'error'); return; }
    setLoading(true);
    const success = await joinByInvite(code);
    setLoading(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {tab === 'create' ? 'مجموعة جديدة' : 'الانضمام لمجموعة'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 mb-6 bg-slate-800 p-1 rounded-xl">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t === 'create' ? 'إنشاء مجموعة' : 'انضمام برمز'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <div className="space-y-4">
            <div>
              <label className="label">اسم المجموعة *</label>
              <input
                className="input"
                placeholder="مثال: رحلة دبي، شقة المدينة..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="label">وصف (اختياري)</label>
              <input
                className="input"
                placeholder="وصف قصير للمجموعة"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="label">العملة</label>
              <div className="relative">
                <select
                  className="input appearance-none cursor-pointer"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.nameAr} ({c.symbol})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'إنشاء المجموعة'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">رمز الدعوة</label>
              <input
                className="input font-mono tracking-widest text-center text-lg uppercase"
                placeholder="XXXXXXXX"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                maxLength={8}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'الانضمام'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
