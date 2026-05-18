import { useEffect } from 'react';
import {
  collection, onSnapshot, deleteDoc, doc,
  setDoc, getDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { Group, GroupMember } from '../types';

export function useGroups() {
  const { user, setGroups, setMembers, currentGroupId, addToast } = useStore();

  useEffect(() => {
    if (!user) return;

    const memberGroupsQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(
      memberGroupsQuery,
      (snap) => {
        const groups: Group[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
        setGroups(groups);
      },
      (error) => { console.error('Groups listener error:', error.code, error.message); }
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
      (error) => { console.error('Members listener error:', error.code, error.message); }
    );
    return unsub;
  }, [currentGroupId, setMembers]);

  const createGroup = async (name: string, description: string, currency: string) => {
    const { user: u } = useStore.getState();
    if (!u) return;
    try {
      const groupRef = doc(collection(db, 'groups'));
      const memberRef = doc(db, 'groups', groupRef.id, 'members', u.uid);
      const batch = writeBatch(db);

      batch.set(groupRef, {
        name: name.trim(),
        description: description.trim(),
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
      addToast('تم إنشاء المجموعة بنجاح!', 'success');
      return groupRef.id;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('createGroup error:', msg);
      addToast('فشل إنشاء المجموعة.', 'error');
    }
  };

  const updateGroup = async (groupId: string, data: Partial<Pick<Group, 'name' | 'description' | 'currency'>>) => {
    try {
      await setDoc(doc(db, 'groups', groupId), data, { merge: true });
      addToast('تم تحديث المجموعة.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('updateGroup error:', msg);
      addToast('فشل تحديث المجموعة.', 'error');
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      addToast('تم حذف المجموعة.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('deleteGroup error:', msg);
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
      addToast('غادرت المجموعة.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('leaveGroup error:', msg);
      addToast('فشل مغادرة المجموعة.', 'error');
    }
  };

  // owner-only: remove another member
  const removeMember = async (groupId: string, memberUid: string) => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const snap = await getDoc(groupRef);
      if (!snap.exists()) return;
      const data = snap.data() as Group & { memberIds: string[] };
      const remaining = data.memberIds.filter(id => id !== memberUid);

      const batch = writeBatch(db);
      batch.delete(doc(db, 'groups', groupId, 'members', memberUid));
      batch.update(groupRef, { memberIds: remaining, memberCount: remaining.length });
      await batch.commit();
      addToast('تم إزالة العضو.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('removeMember error:', msg);
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
      });
      return code;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('createInvite error:', msg);
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
      await batch.commit();
      addToast(`انضممت إلى ${invite.groupName}!`, 'success');
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('joinByInvite error:', msg);
      addToast('فشل الانضمام للمجموعة.', 'error');
      return false;
    }
  };

  return { createGroup, updateGroup, deleteGroup, leaveGroup, removeMember, createInvite, joinByInvite };
}
