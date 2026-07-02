import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup, joinByInvite } from '../../lib/actions';
import { useStore } from '../../store/useStore';
import { CURRENCIES } from '../../lib/currencies';
import { GROUP_CATEGORIES } from '../../lib/categories';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { CategoryPicker } from '../ui/CategoryPicker';

interface Props { onClose: () => void; }

export function CreateGroupModal({ onClose }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [groupCategory, setGroupCategory] = useState('other');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useStore();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) { addToast('أدخل اسم المجموعة.', 'error'); return; }
    setLoading(true);
    const groupId = await createGroup(name, description, currency, groupCategory);
    setLoading(false);
    onClose();
    if (groupId) navigate(`/group/${groupId}`);
  };

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) { addToast('أدخل رمز الدعوة.', 'error'); return; }
    setLoading(true);
    const groupId = await joinByInvite(code);
    setLoading(false);
    if (groupId) {
      onClose();
      navigate(`/group/${groupId}`);
    }
  };

  return (
    <Modal title={tab === 'create' ? 'مجموعة جديدة' : 'الانضمام لمجموعة'} onClose={onClose}>
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
            <label className="label">نوع المجموعة</label>
            <CategoryPicker categories={GROUP_CATEGORIES} value={groupCategory} onChange={setGroupCategory} />
          </div>
          <div>
            <label className="label">العملة</label>
            <Select value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.nameAr} ({c.symbol})
                </option>
              ))}
            </Select>
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
    </Modal>
  );
}
