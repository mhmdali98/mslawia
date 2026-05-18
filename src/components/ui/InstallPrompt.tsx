import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'mslawia-install-dismissed';

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    // already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 z-[55] max-w-md mx-auto">
      <div className="card p-4 flex items-center gap-3 shadow-2xl border-emerald-500/30">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Download className="text-emerald-400" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">تثبيت التطبيق</p>
          <p className="text-slate-500 text-xs">ثبّت مصاريا على هاتفك للوصول السريع</p>
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
