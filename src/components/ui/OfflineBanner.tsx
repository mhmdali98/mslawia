import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[70] bg-amber-500/95 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2 text-amber-950">
      <WifiOff size={14} />
      <span className="text-xs font-medium">أنت غير متصل — البيانات محلية فقط</span>
    </div>
  );
}
