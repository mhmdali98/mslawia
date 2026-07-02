import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerInstallListeners } from './store/useInstall'
import { logError } from './lib/logger'

registerInstallListeners();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/mslawia/sw.js', { scope: '/mslawia/' });

      // Check for a new version whenever the app comes back to the foreground
      // (installed PWAs rarely re-check on their own).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });

      // The SW uses skipWaiting, so a new version takes control as soon as it
      // installs — reload once so the user is on the fresh build immediately.
      // Skip the very first install: the page is already fresh then.
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    } catch (err) {
      logError('SW', err);
    }
  });
}
