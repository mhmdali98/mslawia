import { useEffect, useRef } from 'react';
import {
  collection, onSnapshot, deleteDoc, doc,
  setDoc, getDoc, query, where, writeBatch, increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotifications';
import { Group, GroupMember } from '../types';
import { logError } from '../lib/logger';
import { writeLog } from '../lib/activityLog';

export function useGroups() {
  const { user, setGroups, setMembers, currentGroupId, addToast } = useStore();
  const firstGroupSnap = useRef(true);

  useEffect(() => {
    if (!user) { firstGroupSnap.current = true; return; }

    const memberGroupsQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(
      memberGroupsQuery,
      (snap) => {
        const groups: Group[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
        setGroups(groups);
        useStore.getState().setGroupsLoaded(true);
        if (firstGroupSnap.current) { firstGroupSnap.current = false; return; }
        for (const change of snap.docChanges()) {
          if (change.type !== 'added') continue;
          const g = change.doc.data() as Group;
          if (g.createdBy === user.uid) continue;
          if (snap.metadata.hasPendingWrites) continue;
          addToast(`تمت إضافتك إلى ${g.name}`, 'info');
          notify('مجموعة جديدة', `تمت إضافتك إلى ${g.name}`, `grp-${change.doc.id}`);
        }
      },
      (error) => { logError('useGroups', `Groups listener error: ${error.code} ${error.message}`); }
    );

    return unsub;
  }, [user, setGroups]);

  useEffect(() => {
    if (!currentGroupId) { setMembers([]); return; }

    const membersRef = collection(db, 'groups', currentGroupId, 'members');
    const unsub = onSnapshot(
      membersRef,
      (snap) => {
        const members: GroupMember[] = snap.docs.map(d => ({ uid: d.id, ...d.data() } as GroupMember));
        setMembers(members);
      },
      (error) => { logError('useGroups', `Members listener error: ${error.code} ${error.message}`); }
    );
    return unsub;
  }, [currentGroupId, setMembers]);

  const createGroup = async (name: string, description: string, currency: string, category = 'other') => {
    const { user: u } = useStore.getState();
    if (!u) return;
    try {
      const groupRef = doc(collection(db, 'groups'));
      const memberRef = doc(db, 'groups', groupRef.id, 'members', u.uid);
      const batch = writeBatch(db);

      batch.set(groupRef, {
        name: name.trim(),
        description: description.trim(),
        category,
        createdBy: u.uid,
        createdAt: new Date().toISOString(),
        memberIds: [u.uid],
        memberCount: 1,
        currency: currency || 'USD',
      });
      batch.set(memberRef, {
        uid: u.uid,
        displayName: u.displayName,
        photoURL: u.photoURL || '',
        email: u.email,
        joinedAt: new Date().toISOString(),
      });
      await batch.commit();
      await writeLog(groupRef.id, 'group_created', u, { targetName: name.trim() });
      addToast('تم إنشاء المجموعة بنجاح!', 'success');
      return groupRef.id;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useGroups', `createGroup error: ${msg}`);
      addToast('فشل إنشاء المجموعة.', 'error');
    }
  };

  const updateGroup = async (
    groupId: string,
    data: Partial<Pick<Group, 'name' | 'description' | 'currency' | 'category' | 'permissions' | 'nicknames' | 'simplifyDebts'>>,
    extraInfo?: string
  ) => {
    const { user: u } = useStore.getState();
    try {
      await setDoc(doc(db, 'groups', groupId), data, { merge: true });
      if (u && extraInfo !== undefined) {
        await writeLog(groupId, 'group_settings_changed', u, { extraInfo });
      }
      addToast('تم تحديث المجموعة.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useGroups', `updateGroup error: ${msg}`);
      addToast('فشل تحديث المجموعة.', 'error');
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      addToast('تم حذف المجموعة.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useGroups', `deleteGroup error: ${msg}`);
      addToast('فشل حذف المجموعة.', 'error');
    }
  };

  // leave with ownership transfer fallback
  const leaveGroup = async (groupId: string) => {
    const { user: u } = useStore.getState();
    if (!u) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      const snap = await getDoc(groupRef);
      if (!snap.exists()) return;
      const data = snap.data() as Group & { memberIds: string[] };
      const remaining = data.memberIds.filter(id => id !== u.uid);

      if (remaining.length === 0) {
        // last member: delete entire group
        await deleteDoc(groupRef);
        addToast('غادرت المجموعة وتم حذفها.', 'success');
        return;
      }

      const batch = writeBatch(db);
      batch.delete(doc(db, 'groups', groupId, 'members', u.uid));

      const update: { memberIds: string[]; memberCount: number; createdBy?: string } = {
        memberIds: remaining,
        memberCount: remaining.length,
      };
      // transfer ownership if leaving owner
      if (data.createdBy === u.uid) {
        update.createdBy = remaining[0];
      }
      batch.update(groupRef, update);
      await batch.commit();
      if (u) await writeLog(groupId, 'member_left', u);
      addToast('غادرت المجموعة.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useGroups', `leaveGroup error: ${msg}`);
      addToast('فشل مغادرة المجموعة.', 'error');
    }
  };

  // owner-only: remove another member
  const removeMember = async (groupId: string, memberUid: string) => {
    try {
      // Fix 2: Check if member has active expenses
      const { expenses } = useStore.getState();
      const hasExpenses = expenses.some(
        e => e.paidBy === memberUid || e.splits.some(s => s.uid === memberUid)
      );
      if (hasExpenses) {
        addToast('لا يمكن إزالة عضو لديه مصاريف نشطة في المجموعة. قم بحذف أو تعديل مصاريفه أولاً.', 'error');
        return;
      }

      const groupRef = doc(db, 'groups', groupId);
      const snap = await getDoc(groupRef);
      if (!snap.exists()) return;
      const data = snap.data() as Group & { memberIds: string[] };
      const remaining = data.memberIds.filter(id => id !== memberUid);

      // Fix 7: Last member guard
      if (remaining.length === 0) {
        await deleteDoc(groupRef);
        addToast('تم حذف العضو الأخير وتم حذف المجموعة.', 'success');
        return;
      }

      const { user: u, members: mList } = useStore.getState();
      const removedMember = mList.find(m => m.uid === memberUid);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'groups', groupId, 'members', memberUid));
      batch.update(groupRef, { memberIds: remaining, memberCount: remaining.length });
      await batch.commit();
      if (u) await writeLog(groupId, 'member_removed', u, { targetName: removedMember?.displayName });
      addToast('تم إزالة العضو.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useGroups', `removeMember error: ${msg}`);
      addToast('فشل إزالة العضو.', 'error');
    }
  };

  const createInvite = async (groupId: string, groupName: string): Promise<string | null> => {
    const { user: u } = useStore.getState();
    if (!u) return null;
    try {
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await setDoc(doc(db, 'invites', code), {
        groupId,
        groupName,
        createdBy: u.uid,
        createdAt: new Date().toISOString(),
        expiresAt,
        maxUses: 20,
        usedCount: 0,
      });
      return code;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useGroups', `createInvite error: ${msg}`);
      addToast('فشل إنشاء رابط الدعوة.', 'error');
      return null;
    }
  };

  const joinByInvite = async (code: string) => {
    const { user: u } = useStore.getState();
    if (!u) return false;
    try {
      const inviteSnap = await getDoc(doc(db, 'invites', code));
      if (!inviteSnap.exists()) { addToast('رمز الدعوة غير صالح.', 'error'); return false; }
      const invite = inviteSnap.data();
      if (new Date(invite.expiresAt) < new Date()) {
        addToast('انتهت صلاحية رابط الدعوة.', 'error');
        return false;
      }

      // Fix 8: Check usage count
      if (invite.maxUses !== undefined && invite.usedCount >= invite.maxUses) {
        addToast('رابط الدعوة وصل للحد الأقصى من الاستخدامات.', 'error');
        return false;
      }

      const groupRef = doc(db, 'groups', invite.groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) { addToast('المجموعة غير موجودة.', 'error'); return false; }

      const groupData = groupSnap.data();
      const memberIds = (groupData.memberIds as string[]) || [];
      if (memberIds.includes(u.uid)) {
        addToast('أنت بالفعل عضو في هذه المجموعة.', 'info');
        return true;
      }

      const batch = writeBatch(db);
      batch.set(doc(db, 'groups', invite.groupId, 'members', u.uid), {
        uid: u.uid,
        displayName: u.displayName,
        photoURL: u.photoURL || '',
        email: u.email,
        joinedAt: new Date().toISOString(),
      });
      batch.update(groupRef, {
        memberIds: [...memberIds, u.uid],
        memberCount: memberIds.length + 1,
      });
      // Fix 8: Increment usedCount atomically
      batch.update(doc(db, 'invites', code), { usedCount: increment(1) });
      await batch.commit();
      await writeLog(invite.groupId, 'member_joined', u);
      addToast(`انضممت إلى ${invite.groupName}!`, 'success');
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useGroups', `joinByInvite error: ${msg}`);
      addToast('فشل الانضمام للمجموعة.', 'error');
      return false;
    }
  };

  return { createGroup, updateGroup, deleteGroup, leaveGroup, removeMember, createInvite, joinByInvite };
}
