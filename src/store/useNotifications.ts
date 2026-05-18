import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationsState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  request: () => Promise<boolean>;
}

export const useNotifications = create<NotificationsState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
      request: async () => {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') {
          set({ enabled: true });
          return true;
        }
        if (Notification.permission === 'denied') {
          set({ enabled: false });
          return false;
        }
        const result = await Notification.requestPermission();
        const ok = result === 'granted';
        set({ enabled: ok });
        return ok;
      },
    }),
    { name: 'mslawia-notifications' }
  )
);

export function notify(title: string, body: string, tag?: string, url?: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!useNotifications.getState().enabled) return;
  // Skip when user is actively viewing the tab — toast is enough
  if (document.visibilityState === 'visible') return;

  // Prefer the service worker — system-tray notification, works on mobile PWA
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'notify', title, body, tag, url });
    return;
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, {
          body,
          tag,
          icon: `${import.meta.env.BASE_URL}icon-192.png`,
          badge: `${import.meta.env.BASE_URL}icon-192.png`,
          dir: 'rtl',
          lang: 'ar',
          data: { url: url || import.meta.env.BASE_URL },
        });
      })
      .catch(() => {});
    return;
  }
  try {
    new Notification(title, {
      body,
      icon: `${import.meta.env.BASE_URL}icon-192.png`,
      tag,
    });
  } catch {
    // ignore
  }
}
