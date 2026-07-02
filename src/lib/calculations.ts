import { Expense, Balance, Transfer, GroupMember, Group, Settlement } from '../types';

// Newest first: by date, then by creation time.
export function sortExpensesDesc(a: Expense, b: Expense): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1;
}

// Balances + suggested transfers for a group, honoring its simplifyDebts setting.
export function computeDebts(
  group: Group,
  expenses: Expense[],
  settlements: Settlement[],
  members: GroupMember[]
): { balances: Balance[]; transfers: Transfer[] } {
  const balances = calculateBalances(expenses, settlements, members);
  const transfers = group.simplifyDebts !== false
    ? calculateMinTransfers(balances)
    : calculateDirectDebts(expenses, settlements, members);
  return { balances, transfers };
}

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

// Non-simplified: keep debts pairwise (who owes whom per actual expenses)
export function calculateDirectDebts(
  expenses: Expense[],
  settlements: Pick<Settlement, 'from' | 'to' | 'amount'>[],
  members: GroupMember[]
): Transfer[] {
  const memberMap: Record<string, { displayName: string; photoURL: string }> = {};
  members.forEach(m => { memberMap[m.uid] = { displayName: m.displayName, photoURL: m.photoURL }; });

  // raw[from][to] = gross amount from owes to (unsettled)
  const raw: Record<string, Record<string, number>> = {};

  const add = (from: string, to: string, amount: number) => {
    if (!raw[from]) raw[from] = {};
    raw[from][to] = (raw[from][to] || 0) + amount;
  };

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.uid !== expense.paidBy && split.amount > 0.005) {
        add(split.uid, expense.paidBy, split.amount);
      }
    }
  }

  // Settlements: from paid to → reduces from's debt to to
  // Model as "to now owes from" (netting removes the debt)
  for (const s of settlements) {
    add(s.to, s.from, s.amount);
  }

  const seen = new Set<string>();
  const transfers: Transfer[] = [];

  for (const from of Object.keys(raw)) {
    for (const to of Object.keys(raw[from])) {
      const key = [from, to].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);

      const aOwesB = raw[from]?.[to] || 0;
      const bOwesA = raw[to]?.[from] || 0;
      const net = aOwesB - bOwesA;

      if (net > 0.01) {
        transfers.push({
          from,
          fromName: memberMap[from]?.displayName || '',
          fromPhoto: memberMap[from]?.photoURL || '',
          to,
          toName: memberMap[to]?.displayName || '',
          toPhoto: memberMap[to]?.photoURL || '',
          amount: Math.round(net * 100) / 100,
        });
      } else if (net < -0.01) {
        transfers.push({
          from: to,
          fromName: memberMap[to]?.displayName || '',
          fromPhoto: memberMap[to]?.photoURL || '',
          to: from,
          toName: memberMap[from]?.displayName || '',
          toPhoto: memberMap[from]?.photoURL || '',
          amount: Math.round(-net * 100) / 100,
        });
      }
    }
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
