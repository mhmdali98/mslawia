import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmState {
  options: ConfirmOptions | null;
  resolver: ((ok: boolean) => void) | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  respond: (ok: boolean) => void;
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  options: null,
  resolver: null,
  open: (options) => new Promise<boolean>((resolve) => {
    set({ options, resolver: resolve });
  }),
  respond: (ok) => {
    const { resolver } = get();
    resolver?.(ok);
    set({ options: null, resolver: null });
  },
}));

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useConfirm.getState().open(options);
}
