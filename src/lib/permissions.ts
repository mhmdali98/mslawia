import { Expense, Group, Settlement } from '../types';

// Single source of truth for who can do what inside a group.
export function getPerms(group: Group | undefined, uid: string | undefined) {
  const isOwner = !!group && !!uid && group.createdBy === uid;
  return {
    isOwner,
    canAddExpense: isOwner || group?.permissions?.membersCanAddExpenses !== false,
    canSettle: isOwner || group?.permissions?.membersCanSettle !== false,
    canEditExpense: (e: Expense) => isOwner || e.paidBy === uid || e.createdBy === uid,
    canDeleteSettlement: (s: Settlement) => isOwner || s.createdBy === uid,
  };
}
