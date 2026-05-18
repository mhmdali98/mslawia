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
  toasts: Toast[];
  isLoading: boolean;
  groupsLoaded: boolean;
  expensesLoaded: boolean;

  setUser: (user: User | null) => void;
  setGroups: (groups: Group[]) => void;
  setCurrentGroupId: (id: string | null) => void;
  setMembers: (members: GroupMember[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setSettlements: (settlements: Settlement[]) => void;
  setActivityLogs: (logs: ActivityLogEntry[]) => void;
  setGroupsLoaded: (loaded: boolean) => void;
  setExpensesLoaded: (loaded: boolean) => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      groups: [],
      currentGroupId: null,
      members: [],
      expenses: [],
      settlements: [],
      activityLogs: [],
      toasts: [],
      isLoading: false,
      groupsLoaded: false,
      expensesLoaded: false,

      setUser: (user) => set({ user }),
      setGroups: (groups) => set({ groups }),
      setCurrentGroupId: (id) => set({ currentGroupId: id }),
      setMembers: (members) => set({ members }),
      setExpenses: (expenses) => set({ expenses }),
      setSettlements: (settlements) => set({ settlements }),
      setActivityLogs: (activityLogs) => set({ activityLogs }),
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
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({
        user: null,
        groups: [],
        currentGroupId: null,
        members: [],
        expenses: [],
        settlements: [],
        activityLogs: [],
        toasts: [],
        isLoading: false,
        groupsLoaded: false,
        expensesLoaded: false,
      }),
    }),
    {
      name: 'mslawia-storage',
      partialize: (state) => ({ user: state.user, currentGroupId: state.currentGroupId }),
    }
  )
);
