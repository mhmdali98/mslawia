import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Languages, Settings as SettingsIcon } from 'lucide-react';
import { useNotifications } from '../../store/useNotifications';
import { useLocale } from '../../lib/i18n';
import { useStore } from '../../store/useStore';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { enabled, setEnabled, request } = useNotifications();
  const { locale, setLocale } = useLocale();
  const { addToast } = useStore();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleNotifications = async () => {
    if (enabled) {
      setEnabled(false);
      addToast('تم تعطيل الإشعارات.', 'info');
      return;
    }
    if (!('Notification' in window)) {
      addToast('متصفحك لا يدعم الإشعارات.', 'error');
      return;
    }
    if (Notification.permission === 'denied') {
      addToast('الإشعارات محظورة من إعدادات المتصفح.', 'error');
      return;
    }
    const ok = await request();
    if (ok) addToast('تم تفعيل الإشعارات!', 'success');
    else addToast('لم يتم تفعيل الإشعارات.', 'info');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        aria-label="settings"
      >
        <SettingsIcon size={18} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl min-w-[240px] z-50 overflow-hidden">
          <button
            onClick={() => { toggleNotifications(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {enabled ? <Bell size={15} className="text-emerald-400" /> : <BellOff size={15} />}
            <span className="flex-1 text-right">
              {enabled ? 'الإشعارات مُفعَّلة' : 'تفعيل الإشعارات'}
            </span>
          </button>
          <div className="border-t border-slate-700" />
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
              <Languages size={14} />
              <span>{locale === 'ar' ? 'اللغة' : 'Language'}</span>
            </div>
            <div className="flex gap-1">
              {(['ar', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    locale === l
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500'
                      : 'bg-slate-700 text-slate-300 border border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {l === 'ar' ? 'العربية' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
