// Firestore/auth listeners. Each hook must be mounted exactly ONCE:
//   useAuthListener   → App
//   useGroupsListener → AppRoutes
//   useGroupData      → GroupPage
// Mutations are plain functions in src/lib/actions.ts.
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, onSnapshot, orderBy, query, QuerySnapshot, setDoc, where, limit,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotifications';
import { getCurrency } from '../lib/currencies';
import { logError } from '../lib/logger';
import { ActivityLogEntry, Expense, Group, GroupMember, Settlement } from '../types';

// Calls cb for docs added after the first snapshot (skips local pending writes).
function forEachNewDoc<T>(
  first: { current: boolean },
  snap: QuerySnapshot,
  cb: (id: string, data: T) => void
) {
  if (first.current) { first.current = false; return; }
  if (snap.metadata.hasPendingWrites) return;
  for (const change of snap.docChanges()) {
    if (change.type === 'added') cb(change.doc.id, change.doc.data() as T);
  }
}

// Keeps store.user in sync with Firebase auth; returns true once auth state is known.
export function useAuthListener(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      const store = useStore.getState();
      if (fbUser) {
        const user = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'مستخدم',
          photoURL: fbUser.photoURL || '',
        };
        store.setUser(user);
        setReady(true);
        try {
          await setDoc(doc(db, 'users', user.uid), user, { merge: true });
        } catch (error) {
          logError('auth', error);
        }
      } else {
        store.reset();
        setReady(true);
      }
    });
  }, []);

  return ready;
}

// Subscribes to the groups the user belongs to.
export function useGroupsListener() {
  const userId = useStore(s => s.user?.uid);

  useEffect(() => {
    if (!userId) return;
    const first = { current: true };
    const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));

    return onSnapshot(
      q,
      (snap) => {
        const store = useStore.getState();
        store.setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
        store.setGroupsLoaded(true);
        forEachNewDoc<Group>(first, snap, (id, g) => {
          if (g.createdBy === userId) return;
          store.addToast(`تمت إضافتك إلى ${g.name}`, 'info');
          notify('مجموعة جديدة', `تمت إضافتك إلى ${g.name}`, `grp-${id}`);
        });
      },
      (error) => logError('useGroupsListener', `${error.code} ${error.message}`)
    );
  }, [userId]);
}

// Subscribes to a group's members, expenses, settlements and activity log,
// and keeps store.currentGroupId pointing at it.
export function useGroupData(groupId: string | undefined) {
  useEffect(() => {
    const store = useStore.getState();
    store.setCurrentGroupId(groupId ?? null);
    if (!groupId) return;

    const groupInfo = () => {
      const g = useStore.getState().groups.find(x => x.id === groupId);
      return { name: g?.name || '', symbol: getCurrency(g?.currency || 'USD').symbol };
    };
    const isMine = (createdBy: string) => createdBy === useStore.getState().user?.uid;

    const firstExp = { current: true };
    const firstSet = { current: true };

    const unsubs = [
      onSnapshot(
        collection(db, 'groups', groupId, 'members'),
        (snap) => {
          store.setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as GroupMember)));
        },
        (error) => logError('useGroupData', `members: ${error.code} ${error.message}`)
      ),

      onSnapshot(
        query(collection(db, 'groups', groupId, 'expenses'), orderBy('date', 'desc')),
        (snap) => {
          store.setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
          store.setExpensesLoaded(true);
          forEachNewDoc<Expense>(firstExp, snap, (id, e) => {
            if (isMine(e.createdBy)) return;
            const { name, symbol } = groupInfo();
            const msg = `${e.paidByName}: ${e.title} (${e.amount.toFixed(2)} ${symbol})`;
            store.addToast(`مصروف جديد · ${msg}`, 'info');
            notify(`${name} · مصروف جديد`, msg, `exp-${id}`);
          });
        },
        (error) => logError('useGroupData', `expenses: ${error.code} ${error.message}`)
      ),

      onSnapshot(
        query(collection(db, 'groups', groupId, 'settlements'), orderBy('settledAt', 'desc')),
        (snap) => {
          store.setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)));
          forEachNewDoc<Settlement>(firstSet, snap, (id, s) => {
            if (isMine(s.createdBy)) return;
            const { name, symbol } = groupInfo();
            const msg = `${s.fromName} → ${s.toName} (${s.amount.toFixed(2)} ${symbol})`;
            store.addToast(`تسوية جديدة · ${msg}`, 'info');
            notify(`${name} · تسوية جديدة`, msg, `set-${id}`);
          });
        },
        (error) => logError('useGroupData', `settlements: ${error.code} ${error.message}`)
      ),

      onSnapshot(
        query(collection(db, 'groups', groupId, 'activityLog'), orderBy('timestamp', 'desc'), limit(100)),
        (snap) => {
          store.setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLogEntry)));
        },
        (error) => logError('useGroupData', `activityLog: ${error.code} ${error.message}`)
      ),
    ];

    return () => {
      unsubs.forEach(u => u());
      const s = useStore.getState();
      s.setCurrentGroupId(null);
      s.setMembers([]);
      s.setExpenses([]);
      s.setSettlements([]);
      s.setActivityLogs([]);
      s.setExpensesLoaded(false);
    };
  }, [groupId]);
}
