export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  joinedAt: string;
}

export interface GroupPermissions {
  membersCanAddExpenses: boolean;
  membersCanSettle: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  category?: string;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  currency: string;
  permissions?: GroupPermissions;
  nicknames?: Record<string, string>;
  simplifyDebts?: boolean;
}

export type SplitType = 'equal' | 'custom' | 'percentage';

export interface ExpenseSplit {
  uid: string;
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  paidByName: string;
  paidByPhoto: string;
  splits: ExpenseSplit[];
  splitType: SplitType;
  date: string;
  category?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  from: string;
  fromName: string;
  fromPhoto: string;
  to: string;
  toName: string;
  toPhoto: string;
  amount: number;
  currency: string;
  settledAt: string;
  note?: string;
  createdBy: string;
}

export interface Balance {
  uid: string;
  displayName: string;
  photoURL: string;
  amount: number;
}

export interface Transfer {
  from: string;
  fromName: string;
  fromPhoto: string;
  to: string;
  toName: string;
  toPhoto: string;
  amount: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type ActivityAction =
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'settlement_added'
  | 'settlement_deleted'
  | 'member_joined'
  | 'member_left'
  | 'member_removed'
  | 'group_settings_changed'
  | 'group_created';

export interface ActivityLogEntry {
  id: string;
  groupId: string;
  action: ActivityAction;
  actorId: string;
  actorName: string;
  actorPhoto: string;
  targetName?: string;
  amount?: number;
  currency?: string;
  extraInfo?: string;
  timestamp: string;
}
