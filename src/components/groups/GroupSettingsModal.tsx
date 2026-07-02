import { useState } from 'react';
import { UserMinus, Crown, Shield, Pencil } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { updateGroup, removeMember } from '../../lib/actions';
import { getPerms } from '../../lib/permissions';
import { confirmAction } from '../../store/useConfirm';
import { CURRENCIES } from '../../lib/currencies';
import { GROUP_CATEGORIES } from '../../lib/categories';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { CategoryPicker } from '../ui/CategoryPicker';
import { Group } from '../../types';

interface Props {
  group: Group;
  onClose: () => void;
}

export function GroupSettingsModal({ group, onClose }: Props) {
  const { user, members, addToast } = useStore();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [currency, setCurrency] = useState(group.currency);
  const [groupCategory, setGroupCategory] = useState(group.category || 'other');
  const [membersCanAddExpenses, setMembersCanAddExpenses] = useState(
    group.permissions?.membersCanAddExpenses !== false
  );
  const [membersCanSettle, setMembersCanSettle] = useState(
    group.permissions?.membersCanSettle !== false
  );
  const [simplifyDebts, setSimplifyDebts] = useState(group.simplifyDebts !== false);
  const [loading, setLoading] = useState(false);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState('');

  const { isOwner } = getPerms(group, user?.uid);

  const handleSave = async () => {
    if (!name.trim()) { addToast('اسم المجموعة لا يمكن أن يكون فارغاً.', 'error'); return; }
    setLoading(true);
    await updateGroup(group.id, {
      name: name.trim(),
      description: description.trim(),
      currency,
      category: groupCategory,
      permissions: { membersCanAddExpenses, membersCanSettle },
      simplifyDebts,
    }, 'الإعدادات العامة');
    setLoading(false);
    onClose();
  };

  const handleSaveNickname = async (uid: string) => {
    const trimmed = nicknameValue.trim();
    const updated = { ...group.nicknames };
    if (trimmed) {
      updated[uid] = trimmed;
    } else {
      delete updated[uid];
    }
    await updateGroup(group.id, { nicknames: updated }, 'الألقاب');
    setEditingNickname(null);
  };

  const handleRemove = async (memberUid: string, memberName: string) => {
    const ok = await confirmAction({
      title: 'إزالة العضو؟',
      description: `سيتم إزالة ${memberName} من المجموعة.`,
      confirmLabel: 'إزالة',
      variant: 'danger',
    });
    if (!ok) return;
    await removeMember(group.id, memberUid);
  };

  return (
    <Modal title={isOwner ? 'إعدادات المجموعة' : 'معلومات المجموعة'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">اسم المجموعة</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!isOwner}
          />
        </div>

        <div>
          <label className="label">الوصف</label>
          <input
            className="input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!isOwner}
          />
        </div>

        <div>
          <label className="label">العملة</label>
          <Select value={currency} onChange={e => setCurrency(e.target.value)} disabled={!isOwner}>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.nameAr} ({c.symbol})</option>
            ))}
          </Select>
          <p className="text-slate-500 text-xs mt-1">المصاريف الموجودة تحتفظ بعملتها الأصلية</p>
        </div>

        <div>
          <label className="label">نوع المجموعة</label>
          <CategoryPicker
            categories={GROUP_CATEGORIES}
            value={groupCategory}
            onChange={setGroupCategory}
            disabled={!isOwner}
          />
        </div>

        {isOwner && (
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
              <Shield size={14} className="text-amber-400" />
              صلاحيات الأعضاء
            </div>
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800 cursor-pointer">
              <span className="text-slate-300 text-sm">يمكن للأعضاء إضافة مصاريف</span>
              <input
                type="checkbox"
                checked={membersCanAddExpenses}
                onChange={e => setMembersCanAddExpenses(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800 cursor-pointer">
              <span className="text-slate-300 text-sm">يمكن للأعضاء تسجيل تسويات</span>
              <input
                type="checkbox"
                checked={membersCanSettle}
                onChange={e => setMembersCanSettle(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>
            <p className="text-slate-500 text-xs">المنشئ دائماً يمكنه القيام بكل العمليات.</p>
            <div className="pt-1 border-t border-slate-700">
              <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-2">
                <Shield size={14} className="text-emerald-400" />
                إعداد الحسابات
              </div>
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800 cursor-pointer">
                <div>
                  <span className="text-slate-300 text-sm">تبسيط الديون</span>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {simplifyDebts
                      ? 'يقلل عدد التحويلات بدمج الديون'
                      : 'يُظهر الديون المباشرة بين كل شخصين'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={simplifyDebts}
                  onChange={e => setSimplifyDebts(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 flex-shrink-0"
                />
              </label>
            </div>
          </div>
        )}

        {isOwner && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'حفظ التعديلات'}
          </button>
        )}

        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-slate-300 font-semibold mb-3">الأعضاء ({members.length})</h3>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.uid} className="flex flex-col gap-1 p-3 rounded-xl bg-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar uid={m.uid} name={m.displayName} photoURL={m.photoURL} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {m.uid === user?.uid ? `${m.displayName} (أنت)` : m.displayName}
                    </p>
                    {group.nicknames?.[m.uid] && (
                      <p className="text-emerald-400 text-xs truncate">لقب: {group.nicknames[m.uid]}</p>
                    )}
                    <p className="text-slate-500 text-xs truncate">{m.email}</p>
                  </div>
                  {m.uid === group.createdBy && (
                    <Crown size={14} className="text-amber-400" />
                  )}
                  {isOwner && (
                    <button
                      onClick={() => { setEditingNickname(m.uid); setNicknameValue(group.nicknames?.[m.uid] || ''); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                      title="تعديل اللقب"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {isOwner && m.uid !== user?.uid && (
                    <button
                      onClick={() => handleRemove(m.uid, m.displayName)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
                {isOwner && editingNickname === m.uid && (
                  <div className="flex gap-2 mt-1">
                    <input
                      className="input text-xs py-1 flex-1"
                      placeholder="لقب مخصص (اتركه فارغاً لإزالته)"
                      value={nicknameValue}
                      onChange={e => setNicknameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveNickname(m.uid); if (e.key === 'Escape') setEditingNickname(null); }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveNickname(m.uid)}
                      className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => setEditingNickname(null)}
                      className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!isOwner && (
          <p className="text-slate-500 text-xs text-center">
            فقط مالك المجموعة يمكنه تعديل الإعدادات
          </p>
        )}
      </div>
    </Modal>
  );
}
