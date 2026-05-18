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

export interface Group {
  id: string;
  name: string;
  description?: string;
  category?: string;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  currency: string;
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

export interface Invite {
  id: string;
  groupId: string;
  groupName: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
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
