import { useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  setDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { Expense, Settlement, ExpenseSplit } from '../types';

export interface ExpenseInput {
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  paidByName: string;
  paidByPhoto: string;
  splits: ExpenseSplit[];
  splitType: 'equal' | 'custom' | 'percentage';
  date: string;
  category?: string;
  note?: string;
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

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function useExpenses() {
  const { currentGroupId, setExpenses, setSettlements, addToast } = useStore();

  useEffect(() => {
    if (!currentGroupId) {
      setExpenses([]);
      setSettlements([]);
      useStore.getState().setExpensesLoaded(false);
      return;
    }

    const expQ = query(collection(db, 'groups', currentGroupId, 'expenses'), orderBy('date', 'desc'));
    const setQ = query(collection(db, 'groups', currentGroupId, 'settlements'), orderBy('settledAt', 'desc'));

    const unsubExp = onSnapshot(
      expQ,
      (snap) => {
        setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        useStore.getState().setExpensesLoaded(true);
      },
      (error) => { console.error('Expenses listener error:', error.code, error.message); }
    );
    const unsubSet = onSnapshot(
      setQ,
      (snap) => { setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement))); },
      (error) => { console.error('Settlements listener error:', error.code, error.message); }
    );

    return () => { unsubExp(); unsubSet(); };
  }, [currentGroupId, setExpenses, setSettlements]);

  const addExpense = async (data: ExpenseInput) => {
    const { currentGroupId: gid, user } = useStore.getState();
    if (!gid || !user) { addToast('لم يتم تحديد المجموعة.', 'error'); return; }
    try {
      const payload = stripUndefined({
        ...data,
        groupId: gid,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });
      await addDoc(collection(db, 'groups', gid, 'expenses'), payload);
      addToast('تمت إضافة المصروف!', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('addExpense error:', msg);
      addToast(`فشل إضافة المصروف: ${msg}`, 'error');
    }
  };

  const updateExpense = async (expenseId: string, data: ExpenseInput) => {
    const { currentGroupId: gid } = useStore.getState();
    if (!gid) return;
    try {
      const payload = stripUndefined({
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'groups', gid, 'expenses', expenseId), payload, { merge: true });
      addToast('تم تحديث المصروف.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('updateExpense error:', msg);
      addToast(`فشل تحديث المصروف: ${msg}`, 'error');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    const { currentGroupId: gid } = useStore.getState();
    if (!gid) return;
    try {
      await deleteDoc(doc(db, 'groups', gid, 'expenses', expenseId));
      addToast('تم حذف المصروف.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('deleteExpense error:', msg);
      addToast('فشل حذف المصروف.', 'error');
    }
  };

  const addSettlement = async (data: SettlementInput) => {
    const { currentGroupId: gid, user } = useStore.getState();
    if (!gid || !user) { addToast('لم يتم تحديد المجموعة.', 'error'); return; }
    try {
      const payload = stripUndefined({
        ...data,
        groupId: gid,
        createdBy: user.uid,
        settledAt: new Date().toISOString(),
      });
      await addDoc(collection(db, 'groups', gid, 'settlements'), payload);
      addToast('تم تسجيل التسوية!', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('addSettlement error:', msg);
      addToast('فشل تسجيل التسوية.', 'error');
    }
  };

  const deleteSettlement = async (settlementId: string) => {
    const { currentGroupId: gid } = useStore.getState();
    if (!gid) return;
    try {
      await deleteDoc(doc(db, 'groups', gid, 'settlements', settlementId));
      addToast('تم حذف التسوية.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('deleteSettlement error:', msg);
      addToast('فشل حذف التسوية.', 'error');
    }
  };

  const exportBackup = () => {
    const { expenses, settlements, members, groups, currentGroupId: gid } = useStore.getState();
    const group = groups.find(g => g.id === gid);
    const data = { group, members, expenses, settlements, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group?.name || 'backup'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('تم تصدير البيانات!', 'success');
  };

  return { addExpense, updateExpense, deleteExpense, addSettlement, deleteSettlement, exportBackup };
}
