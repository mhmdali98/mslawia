import { useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { Expense, Settlement, ExpenseSplit } from '../types';

export function useExpenses() {
  const { user, currentGroupId, setExpenses, setSettlements, addToast } = useStore();

  useEffect(() => {
    if (!currentGroupId) { setExpenses([]); setSettlements([]); return; }

    const expQ = query(collection(db, 'groups', currentGroupId, 'expenses'), orderBy('date', 'desc'));
    const setQ = query(collection(db, 'groups', currentGroupId, 'settlements'), orderBy('settledAt', 'desc'));

    const unsubExp = onSnapshot(
      expQ,
      (snap) => { setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))); },
      (error) => { console.error('Expenses listener error:', error.message); }
    );
    const unsubSet = onSnapshot(
      setQ,
      (snap) => { setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement))); },
      (error) => { console.error('Settlements listener error:', error.message); }
    );

    return () => { unsubExp(); unsubSet(); };
  }, [currentGroupId, setExpenses, setSettlements]);

  const addExpense = async (data: {
    title: string;
    amount: number;
    paidBy: string;
    paidByName: string;
    paidByPhoto: string;
    splits: ExpenseSplit[];
    splitType: 'equal' | 'custom';
    date: string;
    note?: string;
  }) => {
    if (!currentGroupId || !user) return;
    try {
      await addDoc(collection(db, 'groups', currentGroupId, 'expenses'), {
        ...data,
        groupId: currentGroupId,
        createdAt: new Date().toISOString(),
      });
      addToast('تمت إضافة المصروف!', 'success');
    } catch {
      addToast('فشل إضافة المصروف.', 'error');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!currentGroupId) return;
    try {
      await deleteDoc(doc(db, 'groups', currentGroupId, 'expenses', expenseId));
      addToast('تم حذف المصروف.', 'success');
    } catch {
      addToast('فشل حذف المصروف.', 'error');
    }
  };

  const addSettlement = async (data: {
    from: string;
    fromName: string;
    fromPhoto: string;
    to: string;
    toName: string;
    toPhoto: string;
    amount: number;
    note?: string;
  }) => {
    if (!currentGroupId || !user) return;
    try {
      await addDoc(collection(db, 'groups', currentGroupId, 'settlements'), {
        ...data,
        groupId: currentGroupId,
        settledAt: new Date().toISOString(),
      });
      addToast('تم تسجيل التسوية!', 'success');
    } catch {
      addToast('فشل تسجيل التسوية.', 'error');
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

  return { addExpense, deleteExpense, addSettlement, exportBackup };
}
