import { useEffect, useRef } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  setDoc, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotifications';
import { getCurrency } from '../lib/currencies';
import { Expense, Settlement, ExpenseSplit, ActivityLogEntry } from '../types';
import { logError } from '../lib/logger';
import { writeLog } from '../lib/activityLog';

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
  const { currentGroupId, setExpenses, setSettlements, setActivityLogs, addToast } = useStore();
  const firstExpSnap = useRef(true);
  const firstSetSnap = useRef(true);

  useEffect(() => {
    if (!currentGroupId) {
      setExpenses([]);
      setSettlements([]);
      setActivityLogs([]);
      useStore.getState().setExpensesLoaded(false);
      firstExpSnap.current = true;
      firstSetSnap.current = true;
      return;
    }

    const expQ = query(collection(db, 'groups', currentGroupId, 'expenses'), orderBy('date', 'desc'));
    const setQ = query(collection(db, 'groups', currentGroupId, 'settlements'), orderBy('settledAt', 'desc'));
    const logQ = query(
      collection(db, 'groups', currentGroupId, 'activityLog'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubExp = onSnapshot(
      expQ,
      (snap) => {
        setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        useStore.getState().setExpensesLoaded(true);
        if (firstExpSnap.current) { firstExpSnap.current = false; return; }
        const { user, groups: gs } = useStore.getState();
        const grp = gs.find(g => g.id === currentGroupId);
        const sym = getCurrency(grp?.currency || 'USD').symbol;
        for (const change of snap.docChanges()) {
          if (change.type !== 'added') continue;
          const e = change.doc.data() as Expense;
          if (!user || e.createdBy === user.uid) continue;
          if (snap.metadata.hasPendingWrites) continue;
          const msg = `${e.paidByName}: ${e.title} (${e.amount.toFixed(2)} ${sym})`;
          addToast(`مصروف جديد · ${msg}`, 'info');
          notify(`${grp?.name || ''} · مصروف جديد`, msg, `exp-${change.doc.id}`);
        }
      },
      (error) => { logError('useExpenses', `Expenses listener error: ${error.code} ${error.message}`); }
    );

    const unsubSet = onSnapshot(
      setQ,
      (snap) => {
        setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)));
        if (firstSetSnap.current) { firstSetSnap.current = false; return; }
        const { user, groups: gs } = useStore.getState();
        const grp = gs.find(g => g.id === currentGroupId);
        const sym = getCurrency(grp?.currency || 'USD').symbol;
        for (const change of snap.docChanges()) {
          if (change.type !== 'added') continue;
          const s = change.doc.data() as Settlement;
          if (!user || s.createdBy === user.uid) continue;
          if (snap.metadata.hasPendingWrites) continue;
          const msg = `${s.fromName} → ${s.toName} (${s.amount.toFixed(2)} ${sym})`;
          addToast(`تسوية جديدة · ${msg}`, 'info');
          notify(`${grp?.name || ''} · تسوية جديدة`, msg, `set-${change.doc.id}`);
        }
      },
      (error) => { logError('useExpenses', `Settlements listener error: ${error.code} ${error.message}`); }
    );

    const unsubLog = onSnapshot(
      logQ,
      (snap) => {
        setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLogEntry)));
      },
      (error) => { logError('useExpenses', `ActivityLog listener error: ${error.code} ${error.message}`); }
    );

    return () => { unsubExp(); unsubSet(); unsubLog(); };
  }, [currentGroupId, setExpenses, setSettlements, setActivityLogs]);

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
      await writeLog(gid, 'expense_added', user, {
        targetName: data.title,
        amount: data.amount,
        currency: data.currency,
      });
      addToast('تمت إضافة المصروف!', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useExpenses', `addExpense error: ${msg}`);
      addToast(`فشل إضافة المصروف: ${msg}`, 'error');
    }
  };

  const updateExpense = async (expenseId: string, data: ExpenseInput) => {
    const { currentGroupId: gid, user } = useStore.getState();
    if (!gid) return;
    try {
      const payload = stripUndefined({
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid,
        updatedByName: user?.displayName,
      });
      await setDoc(doc(db, 'groups', gid, 'expenses', expenseId), payload, { merge: true });
      if (user) {
        await writeLog(gid, 'expense_edited', user, {
          targetName: data.title,
          amount: data.amount,
          currency: data.currency,
        });
      }
      addToast('تم تحديث المصروف.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useExpenses', `updateExpense error: ${msg}`);
      addToast(`فشل تحديث المصروف: ${msg}`, 'error');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    const { currentGroupId: gid, user, expenses } = useStore.getState();
    if (!gid) return;
    const expense = expenses.find(e => e.id === expenseId);
    try {
      await deleteDoc(doc(db, 'groups', gid, 'expenses', expenseId));
      if (user && expense) {
        await writeLog(gid, 'expense_deleted', user, {
          targetName: expense.title,
          amount: expense.amount,
          currency: expense.currency,
        });
      }
      addToast('تم حذف المصروف.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useExpenses', `deleteExpense error: ${msg}`);
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
      await writeLog(gid, 'settlement_added', user, {
        amount: data.amount,
        currency: data.currency,
        extraInfo: data.toName,
      });
      addToast('تم تسجيل التسوية!', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useExpenses', `addSettlement error: ${msg}`);
      addToast('فشل تسجيل التسوية.', 'error');
    }
  };

  const deleteSettlement = async (settlementId: string) => {
    const { currentGroupId: gid, user, settlements } = useStore.getState();
    if (!gid) return;
    const settlement = settlements.find(s => s.id === settlementId);
    try {
      await deleteDoc(doc(db, 'groups', gid, 'settlements', settlementId));
      if (user && settlement) {
        await writeLog(gid, 'settlement_deleted', user, {
          amount: settlement.amount,
          currency: settlement.currency,
          extraInfo: settlement.toName,
        });
      }
      addToast('تم حذف التسوية.', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('useExpenses', `deleteSettlement error: ${msg}`);
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
