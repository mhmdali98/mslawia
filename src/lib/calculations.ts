import { Expense, Balance, Transfer, GroupMember } from '../types';

export function calculateBalances(
  expenses: Expense[],
  settlements: { from: string; to: string; amount: number }[],
  members: GroupMember[]
): Balance[] {
  const balanceMap: Record<string, number> = {};

  members.forEach(m => { balanceMap[m.uid] = 0; });

  for (const expense of expenses) {
    balanceMap[expense.paidBy] = (balanceMap[expense.paidBy] || 0) + expense.amount;
    for (const split of expense.splits) {
      balanceMap[split.uid] = (balanceMap[split.uid] || 0) - split.amount;
    }
  }

  for (const s of settlements) {
    balanceMap[s.from] = (balanceMap[s.from] || 0) + s.amount;
    balanceMap[s.to] = (balanceMap[s.to] || 0) - s.amount;
  }

  return members.map(m => ({
    uid: m.uid,
    displayName: m.displayName,
    photoURL: m.photoURL,
    amount: Math.round((balanceMap[m.uid] || 0) * 100) / 100,
  }));
}

export function calculateMinTransfers(balances: Balance[]): Transfer[] {
  const memberMap: Record<string, { displayName: string; photoURL: string }> = {};
  balances.forEach(b => { memberMap[b.uid] = { displayName: b.displayName, photoURL: b.photoURL }; });

  const creditors: { uid: string; amount: number }[] = [];
  const debtors: { uid: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.amount > 0.01) creditors.push({ uid: b.uid, amount: b.amount });
    else if (b.amount < -0.01) debtors.push({ uid: b.uid, amount: -b.amount });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const amount = Math.min(credit.amount, debt.amount);

    transfers.push({
      from: debt.uid,
      fromName: memberMap[debt.uid]?.displayName || '',
      fromPhoto: memberMap[debt.uid]?.photoURL || '',
      to: credit.uid,
      toName: memberMap[credit.uid]?.displayName || '',
      toPhoto: memberMap[credit.uid]?.photoURL || '',
      amount: Math.round(amount * 100) / 100,
    });

    credit.amount -= amount;
    debt.amount -= amount;

    if (credit.amount < 0.01) i++;
    if (debt.amount < 0.01) j++;
  }

  return transfers;
}

export function splitEqually(amount: number, memberIds: string[]): Record<string, number> {
  if (memberIds.length === 0) return {};
  const each = Math.round((amount / memberIds.length) * 100) / 100;
  const result: Record<string, number> = {};
  let total = 0;
  memberIds.forEach((uid, idx) => {
    if (idx === memberIds.length - 1) {
      result[uid] = Math.round((amount - total) * 100) / 100;
    } else {
      result[uid] = each;
      total += each;
    }
  });
  return result;
}
