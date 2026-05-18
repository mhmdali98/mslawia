import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  setDeferred: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (v: boolean) => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const useInstall = create<InstallState>((set, get) => ({
  deferred: null,
  installed: false,
  setDeferred: (deferred) => set({ deferred }),
  setInstalled: (installed) => set({ installed, deferred: null }),
  promptInstall: async () => {
    const d = get().deferred;
    if (!d) return 'unavailable';
    await d.prompt();
    const choice = await d.userChoice;
    set({ deferred: null });
    return choice.outcome;
  },
}));

export function registerInstallListeners() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(display-mode: standalone)').matches) {
    useInstall.getState().setInstalled(true);
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.getState().setDeferred(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    useInstall.getState().setInstalled(true);
  });
}
