import { useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  setDoc, getDoc, query, where,
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

    const unsub = onSnapshot(memberGroupsQuery, (snap) => {
      const groups: Group[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
      setGroups(groups);
    });

    return unsub;
  }, [user, setGroups]);

  useEffect(() => {
    if (!currentGroupId) { setMembers([]); return; }

    const membersRef = collection(db, 'groups', currentGroupId, 'members');
    const unsub = onSnapshot(membersRef, (snap) => {
      const members: GroupMember[] = snap.docs.map(d => ({ uid: d.id, ...d.data() } as GroupMember));
      setMembers(members);
    });
    return unsub;
  }, [currentGroupId, setMembers]);

  const createGroup = async (name: string, description?: string) => {
    if (!user) return;
    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name,
        description: description || '',
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        memberIds: [user.uid],
        memberCount: 1,
        currency: 'USD',
      });
      const memberRef = doc(db, 'groups', groupRef.id, 'members', user.uid);
      await setDoc(memberRef, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        joinedAt: new Date().toISOString(),
      });
      addToast('تم إنشاء المجموعة بنجاح!', 'success');
      return groupRef.id;
    } catch {
      addToast('فشل إنشاء المجموعة.', 'error');
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      addToast('تم حذف المجموعة.', 'success');
    } catch {
      addToast('فشل حذف المجموعة.', 'error');
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'members', user.uid));
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const data = groupSnap.data();
        const newMemberIds = (data.memberIds as string[]).filter(id => id !== user.uid);
        await setDoc(groupRef, { memberIds: newMemberIds, memberCount: newMemberIds.length }, { merge: true });
      }
      addToast('غادرت المجموعة.', 'success');
    } catch {
      addToast('فشل مغادرة المجموعة.', 'error');
    }
  };

  const createInvite = async (groupId: string, groupName: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await setDoc(doc(db, 'invites', code), {
        groupId,
        groupName,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        expiresAt,
      });
      return code;
    } catch {
      addToast('فشل إنشاء رابط الدعوة.', 'error');
      return null;
    }
  };

  const joinByInvite = async (code: string) => {
    if (!user) return false;
    try {
      const inviteSnap = await getDoc(doc(db, 'invites', code));
      if (!inviteSnap.exists()) { addToast('رمز الدعوة غير صالح.', 'error'); return false; }
      const invite = inviteSnap.data();
      if (new Date(invite.expiresAt) < new Date()) { addToast('انتهت صلاحية رابط الدعوة.', 'error'); return false; }

      const groupRef = doc(db, 'groups', invite.groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) { addToast('المجموعة غير موجودة.', 'error'); return false; }

      const groupData = groupSnap.data();
      if ((groupData.memberIds as string[]).includes(user.uid)) {
        addToast('أنت بالفعل عضو في هذه المجموعة.', 'info');
        return true;
      }

      await setDoc(doc(db, 'groups', invite.groupId, 'members', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        joinedAt: new Date().toISOString(),
      });
      const newMemberIds = [...(groupData.memberIds as string[]), user.uid];
      await setDoc(groupRef, { memberIds: newMemberIds, memberCount: newMemberIds.length }, { merge: true });
      addToast(`انضممت إلى ${invite.groupName}!`, 'success');
      return true;
    } catch {
      addToast('فشل الانضمام للمجموعة.', 'error');
      return false;
    }
  };

  return { createGroup, deleteGroup, leaveGroup, createInvite, joinByInvite };
}
