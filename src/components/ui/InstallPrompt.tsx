import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstall } from '../../store/useInstall';

const DISMISSED_KEY = 'mslawia-install-dismissed';

export function InstallPrompt() {
  const { deferred, installed, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');

  if (installed || dismissed || !deferred) return null;

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 z-[55] max-w-md mx-auto">
      <div className="card p-4 flex items-center gap-3 shadow-2xl border-emerald-500/30">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Download className="text-emerald-400" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">تثبيت التطبيق</p>
          <p className="text-slate-500 text-xs">ثبّت مصلاوية على هاتفك للوصول السريع</p>
        </div>
        <button onClick={handleInstall} className="btn-primary text-xs py-2 px-3 flex-shrink-0">
          تثبيت
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
