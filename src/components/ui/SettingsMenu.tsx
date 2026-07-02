import { useState } from 'react';
import { Bell, BellOff, Download, Settings as SettingsIcon, Check } from 'lucide-react';
import { useNotifications } from '../../store/useNotifications';
import { useStore } from '../../store/useStore';
import { useInstall } from '../../store/useInstall';
import { useClickOutside } from '../../hooks/useClickOutside';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const { enabled, setEnabled, request } = useNotifications();
  const { addToast } = useStore();
  const { deferred, installed, promptInstall } = useInstall();

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

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'unavailable') {
      addToast('التطبيق مثبّت بالفعل أو غير متاح للتثبيت على هذا المتصفح.', 'info');
    } else if (outcome === 'accepted') {
      addToast('تم تثبيت التطبيق!', 'success');
    }
    setOpen(false);
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

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
          {installed ? (
            <div className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <Check size={15} className="text-emerald-400" />
              <span className="flex-1 text-right">التطبيق مثبّت ✓</span>
            </div>
          ) : deferred ? (
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Download size={15} className="text-emerald-400" />
              <span className="flex-1 text-right">تثبيت التطبيق</span>
            </button>
          ) : isIOS ? (
            <p className="px-4 py-2 text-xs text-slate-500">
              لتثبيت على iPhone: اضغط مشاركة ثم أضف إلى الشاشة الرئيسية
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
