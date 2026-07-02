import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Group, GroupMember, Expense, Settlement, Toast, ActivityLogEntry } from '../types';

interface AppState {
  user: User | null;
  groups: Group[];
  currentGroupId: string | null;
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  activityLogs: ActivityLogEntry[];
  groupBalanceCache: Record<string, { amount: number; currency: string; updatedAt: string }>;
  toasts: Toast[];
  groupsLoaded: boolean;
  expensesLoaded: boolean;

  setUser: (user: User | null) => void;
  setGroups: (groups: Group[]) => void;
  setCurrentGroupId: (id: string | null) => void;
  setMembers: (members: GroupMember[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setSettlements: (settlements: Settlement[]) => void;
  setActivityLogs: (logs: ActivityLogEntry[]) => void;
  cacheGroupBalance: (groupId: string, amount: number, currency: string) => void;
  setGroupsLoaded: (loaded: boolean) => void;
  setExpensesLoaded: (loaded: boolean) => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  reset: () => void;
}

const initialData = {
  user: null,
  groups: [],
  currentGroupId: null,
  members: [],
  expenses: [],
  settlements: [],
  activityLogs: [],
  groupBalanceCache: {},
  toasts: [],
  groupsLoaded: false,
  expensesLoaded: false,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialData,

      setUser: (user) => set({ user }),
      setGroups: (groups) => set({ groups }),
      setCurrentGroupId: (id) => set({ currentGroupId: id }),
      setMembers: (members) => set({ members }),
      setExpenses: (expenses) => set({ expenses }),
      setSettlements: (settlements) => set({ settlements }),
      setActivityLogs: (activityLogs) => set({ activityLogs }),
      cacheGroupBalance: (groupId, amount, currency) => set((state) => ({
        groupBalanceCache: {
          ...state.groupBalanceCache,
          [groupId]: { amount, currency, updatedAt: new Date().toISOString() },
        },
      })),
      setGroupsLoaded: (groupsLoaded) => set({ groupsLoaded }),
      setExpensesLoaded: (expensesLoaded) => set({ expensesLoaded }),
      addToast: (message, type) => {
        const id = Math.random().toString(36).slice(2);
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
        }, 4000);
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
      reset: () => set(initialData),
    }),
    {
      name: 'mslawia-storage',
      partialize: (state) => ({
        user: state.user,
        currentGroupId: state.currentGroupId,
        groupBalanceCache: state.groupBalanceCache,
      }),
    }
  )
);
