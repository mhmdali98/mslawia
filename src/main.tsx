import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useLocale } from './lib/i18n'

// Apply persisted locale direction on boot
const initialLocale = useLocale.getState().locale;
document.documentElement.lang = initialLocale;
document.documentElement.dir = initialLocale === 'ar' ? 'rtl' : 'ltr';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/mslawia/sw.js', { scope: '/mslawia/' })
      .catch((err) => console.warn('SW registration failed:', err));
  });
}
