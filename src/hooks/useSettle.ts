import { useState } from 'react';
import { useStore } from '../store/useStore';
import { confirmAction } from '../store/useConfirm';
import { settleTransfer } from '../lib/actions';
import { getCurrency } from '../lib/currencies';
import { useNickname } from './useNickname';
import { Transfer } from '../types';

// Confirm-then-record for a suggested transfer, with per-transfer loading state.
export function useSettle(currency: string) {
  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const { user, currentGroupId } = useStore();
  const getNickname = useNickname(currentGroupId ?? undefined);

  const settle = async (t: Transfer) => {
    const symbol = getCurrency(currency).symbol;
    const iAmPayer = t.from === user?.uid;
    const otherName = iAmPayer
      ? getNickname(t.to, t.toName)
      : getNickname(t.from, t.fromName);
    const ok = await confirmAction({
      title: 'تأكيد الدفعة',
      description: `سجّل دفعة بمبلغ ${t.amount.toFixed(2)} ${symbol} ${iAmPayer ? `لـ ${otherName}` : `من ${otherName}`}؟`,
      confirmLabel: 'تأكيد',
    });
    if (!ok) return;
    setSettlingKey(`${t.from}-${t.to}`);
    await settleTransfer(t, currency);
    setSettlingKey(null);
  };

  return { settlingKey, settle };
}
