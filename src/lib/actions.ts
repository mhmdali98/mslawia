// All Firestore/auth mutations as plain functions (not hooks).
// Listeners live in src/hooks/useListeners.ts — mounted exactly once each.
import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc,
  getDoc, increment, setDoc, writeBatch,
} from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider } from './firebase';
import { useStore } from '../store/useStore';
import { confirmAction } from '../store/useConfirm';
import { logError } from './logger';
import { writeLog } from './activityLog';
import {
  Expense, ExpenseSplit, Group, Settlement, SplitType, Transfer, User,
} from '../types';

export interface ExpenseInput {
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  paidByName: string;
  paidByPhoto: string;
  splits: ExpenseSplit[];
  splitType: SplitType;
  date: string;
  category: string;
  note: string;
}

export interface SettlementInput {
  from: string;
  fromName: string;
  fromPhoto: string;
  to: string;
  toName: string;
  toPhoto: string;
  amount: number;
  currency: string;
  note?: string;
}

const toast = (msg: string, type: 'success' | 'error' | 'info') =>
  useStore.getState().addToast(msg, type);

const now = () => new Date().toISOString();

const currentUser = (): User | null => useStore.getState().user;

// Shared wrapper: every mutation logs + toasts failures the same way.
async function run<T>(context: string, failMsg: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logError(context, error);
    toast(failMsg, 'error');
    return null;
  }
}

function memberDoc(u: User) {
  return {
    uid: u.uid,
    displayName: u.displayName,
    photoURL: u.photoURL || '',
    email: u.email,
    joinedAt: now(),
  };
}

// ---------- auth ----------

export async function signInWithGoogle() {
  await run('auth', 'فشل تسجيل الدخول. حاول مرة أخرى.', () =>
    signInWithPopup(auth, googleProvider));
}

export async function logout() {
  await run('auth', 'حدث خطأ أثناء تسجيل الخروج.', async () => {
    await signOut(auth);
    useStore.getState().reset();
  });
}

// ---------- groups ----------

export async function createGroup(name: string, description: string, currency: string, category: string) {
  const u = currentUser();
  if (!u) return null;
  return run('createGroup', 'فشل إنشاء المجموعة.', async () => {
    const groupRef = doc(collection(db, 'groups'));
    const batch = writeBatch(db);
    batch.set(groupRef, {
      name: name.trim(),
      description: description.trim(),
      category,
      createdBy: u.uid,
      createdAt: now(),
      memberIds: [u.uid],
      memberCount: 1,
      currency: currency || 'USD',
    });
    batch.set(doc(db, 'groups', groupRef.id, 'members', u.uid), memberDoc(u));
    await batch.commit();
    await writeLog(groupRef.id, 'group_created', u, { targetName: name.trim() });
    toast('تم إنشاء المجموعة بنجاح!', 'success');
    return groupRef.id;
  });
}

export async function updateGroup(
  groupId: string,
  data: Partial<Pick<Group, 'name' | 'description' | 'currency' | 'category' | 'permissions' | 'nicknames' | 'simplifyDebts'>>,
  extraInfo?: string
) {
  const u = currentUser();
  await run('updateGroup', 'فشل تحديث المجموعة.', async () => {
    await setDoc(doc(db, 'groups', groupId), data, { merge: true });
    if (u && extraInfo !== undefined) {
      await writeLog(groupId, 'group_settings_changed', u, { extraInfo });
    }
    toast('تم تحديث المجموعة.', 'success');
  });
}

export async function deleteGroup(groupId: string) {
  await run('deleteGroup', 'فشل حذف المجموعة.', async () => {
    await deleteDoc(doc(db, 'groups', groupId));
    toast('تم حذف المجموعة.', 'success');
  });
}

export async function leaveGroup(groupId: string) {
  const u = currentUser();
  if (!u) return;
  await run('leaveGroup', 'فشل مغادرة المجموعة.', async () => {
    const groupRef = doc(db, 'groups', groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) return;
    const data = snap.data() as Group & { memberIds: string[] };
    const remaining = data.memberIds.filter(id => id !== u.uid);

    if (remaining.length === 0) {
      // last member: delete entire group
      await deleteDoc(groupRef);
      toast('غادرت المجموعة وتم حذفها.', 'success');
      return;
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, 'groups', groupId, 'members', u.uid));
    batch.update(groupRef, {
      memberIds: arrayRemove(u.uid),
      memberCount: increment(-1),
      // transfer ownership if the owner leaves
      ...(data.createdBy === u.uid ? { createdBy: remaining[0] } : {}),
    });
    await batch.commit();
    await writeLog(groupId, 'member_left', u);
    toast('غادرت المجموعة.', 'success');
  });
}

// owner-only: remove another member
export async function removeMember(groupId: string, memberUid: string) {
  await run('removeMember', 'فشل إزالة العضو.', async () => {
    const { user: u, members, expenses } = useStore.getState();
    const hasExpenses = expenses.some(
      e => e.paidBy === memberUid || e.splits.some(s => s.uid === memberUid)
    );
    if (hasExpenses) {
      toast('لا يمكن إزالة عضو لديه مصاريف نشطة في المجموعة. قم بحذف أو تعديل مصاريفه أولاً.', 'error');
      return;
    }

    const removedName = members.find(m => m.uid === memberUid)?.displayName;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'groups', groupId, 'members', memberUid));
    batch.update(doc(db, 'groups', groupId), {
      memberIds: arrayRemove(memberUid),
      memberCount: increment(-1),
    });
    await batch.commit();
    if (u) await writeLog(groupId, 'member_removed', u, { targetName: removedName });
    toast('تم إزالة العضو.', 'success');
  });
}

// ---------- invites ----------

export async function createInvite(groupId: string, groupName: string): Promise<string | null> {
  const u = currentUser();
  if (!u) return null;
  return run('createInvite', 'فشل إنشاء رابط الدعوة.', async () => {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    await setDoc(doc(db, 'invites', code), {
      groupId,
      groupName,
      createdBy: u.uid,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxUses: 20,
      usedCount: 0,
    });
    return code;
  });
}

// Returns the joined group id (also when already a member), or null on failure.
export async function joinByInvite(code: string): Promise<string | null> {
  const u = currentUser();
  if (!u) return null;
  return run('joinByInvite', 'فشل الانضمام للمجموعة.', async () => {
    const inviteSnap = await getDoc(doc(db, 'invites', code));
    if (!inviteSnap.exists()) { toast('رمز الدعوة غير صالح.', 'error'); return null; }
    const invite = inviteSnap.data();
    if (new Date(invite.expiresAt) < new Date()) {
      toast('انتهت صلاحية رابط الدعوة.', 'error');
      return null;
    }
    if (invite.maxUses !== undefined && invite.usedCount >= invite.maxUses) {
      toast('رابط الدعوة وصل للحد الأقصى من الاستخدامات.', 'error');
      return null;
    }

    const groupId = invite.groupId as string;
    const groupSnap = await getDoc(doc(db, 'groups', groupId));
    if (!groupSnap.exists()) { toast('المجموعة غير موجودة.', 'error'); return null; }
    if (((groupSnap.data().memberIds as string[]) || []).includes(u.uid)) {
      toast('أنت بالفعل عضو في هذه المجموعة.', 'info');
      return groupId;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'groups', groupId, 'members', u.uid), memberDoc(u));
    batch.update(doc(db, 'groups', groupId), {
      memberIds: arrayUnion(u.uid),
      memberCount: increment(1),
    });
    batch.update(doc(db, 'invites', code), { usedCount: increment(1) });
    await batch.commit();
    await writeLog(groupId, 'member_joined', u);
    toast(`انضممت إلى ${invite.groupName}!`, 'success');
    return groupId;
  });
}

// ---------- expenses ----------

export async function addExpense(data: ExpenseInput) {
  const { currentGroupId: gid, user: u } = useStore.getState();
  if (!gid || !u) { toast('لم يتم تحديد المجموعة.', 'error'); return; }
  await run('addExpense', 'فشل إضافة المصروف.', async () => {
    await addDoc(collection(db, 'groups', gid, 'expenses'), {
      ...data,
      groupId: gid,
      createdBy: u.uid,
      createdAt: now(),
    });
    await writeLog(gid, 'expense_added', u, {
      targetName: data.title, amount: data.amount, currency: data.currency,
    });
    toast('تمت إضافة المصروف!', 'success');
  });
}

export async function updateExpense(expenseId: string, data: ExpenseInput) {
  const { currentGroupId: gid, user: u } = useStore.getState();
  if (!gid || !u) return;
  await run('updateExpense', 'فشل تحديث المصروف.', async () => {
    await setDoc(doc(db, 'groups', gid, 'expenses', expenseId), {
      ...data,
      updatedAt: now(),
      updatedBy: u.uid,
      updatedByName: u.displayName,
    }, { merge: true });
    await writeLog(gid, 'expense_edited', u, {
      targetName: data.title, amount: data.amount, currency: data.currency,
    });
    toast('تم تحديث المصروف.', 'success');
  });
}

// Confirms with the user, then deletes.
export async function deleteExpense(expense: Expense) {
  const ok = await confirmAction({
    title: 'حذف المصروف؟',
    description: `سيتم حذف "${expense.title}" بشكل نهائي.`,
    confirmLabel: 'حذف',
    variant: 'danger',
  });
  if (!ok) return;
  const { currentGroupId: gid, user: u } = useStore.getState();
  if (!gid) return;
  await run('deleteExpense', 'فشل حذف المصروف.', async () => {
    await deleteDoc(doc(db, 'groups', gid, 'expenses', expense.id));
    if (u) {
      await writeLog(gid, 'expense_deleted', u, {
        targetName: expense.title, amount: expense.amount, currency: expense.currency,
      });
    }
    toast('تم حذف المصروف.', 'success');
  });
}

// ---------- settlements ----------

export async function addSettlement(data: SettlementInput) {
  const { currentGroupId: gid, user: u } = useStore.getState();
  if (!gid || !u) { toast('لم يتم تحديد المجموعة.', 'error'); return; }
  await run('addSettlement', 'فشل تسجيل التسوية.', async () => {
    await addDoc(collection(db, 'groups', gid, 'settlements'), {
      ...data,
      note: data.note?.trim() || '',
      groupId: gid,
      createdBy: u.uid,
      settledAt: now(),
    });
    await writeLog(gid, 'settlement_added', u, {
      amount: data.amount, currency: data.currency, extraInfo: data.toName,
    });
    toast('تم تسجيل التسوية!', 'success');
  });
}

// Records a suggested transfer as a settlement.
export function settleTransfer(t: Transfer, currency: string) {
  return addSettlement({
    from: t.from, fromName: t.fromName, fromPhoto: t.fromPhoto,
    to: t.to, toName: t.toName, toPhoto: t.toPhoto,
    amount: t.amount, currency,
  });
}

// Confirms with the user, then deletes.
export async function deleteSettlement(settlement: Settlement) {
  const ok = await confirmAction({
    title: 'حذف التسوية؟',
    description: 'سيتم حذف هذه الدفعة المسجّلة بشكل نهائي.',
    confirmLabel: 'حذف',
    variant: 'danger',
  });
  if (!ok) return;
  const { currentGroupId: gid, user: u } = useStore.getState();
  if (!gid) return;
  await run('deleteSettlement', 'فشل حذف التسوية.', async () => {
    await deleteDoc(doc(db, 'groups', gid, 'settlements', settlement.id));
    if (u) {
      await writeLog(gid, 'settlement_deleted', u, {
        amount: settlement.amount, currency: settlement.currency, extraInfo: settlement.toName,
      });
    }
    toast('تم حذف التسوية.', 'success');
  });
}

// ---------- backup ----------

export function exportBackup() {
  const { expenses, settlements, members, groups, currentGroupId: gid } = useStore.getState();
  const group = groups.find(g => g.id === gid);
  const data = { group, members, expenses, settlements, exportedAt: now() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${group?.name || 'backup'}-${now().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('تم تصدير البيانات!', 'success');
}
