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
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/mslawia/sw.js', { scope: '/mslawia/' })
      .catch((err) => logError('SW', err));
  });
}
