import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Share2, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { createInvite } from '../../lib/actions';
import { useStore } from '../../store/useStore';
import { logError } from '../../lib/logger';
import { Group } from '../../types';

// Creates an invite and offers three ways to send it: QR scan, share sheet, copy.
export function InviteModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const { addToast } = useStore();
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requested = useRef(false);

  const link = code ? `${window.location.origin}/mslawia/join/${code}` : '';
  const shareText = `انضم إلى مجموعة "${group.name}" على مصلاوية لتقسيم المصاريف بيننا:\n${link}`;

  useEffect(() => {
    if (requested.current) return;
    requested.current = true; // guard: one invite per modal open
    (async () => {
      const c = await createInvite(group.id, group.name);
      if (!c) { onClose(); return; }
      setCode(c);
      try {
        const url = `${window.location.origin}/mslawia/join/${c}`;
        setQr(await QRCode.toDataURL(url, {
          width: 512,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        }));
      } catch (error) {
        logError('InviteModal', error);
      }
    })();
  }, [group.id, group.name, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(`رابط الدعوة: ${link}`, 'info');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // user closed the share sheet
      }
    } else {
      // desktop fallback: WhatsApp web with prefilled message
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <Modal title={`دعوة إلى ${group.name}`} onClose={onClose}>
      {!code ? (
        <div className="flex flex-col items-center py-10 gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-slate-400 text-sm">جارٍ إنشاء رابط الدعوة...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* QR code */}
          <div className="flex flex-col items-center gap-3">
            {qr && (
              <div className="bg-white p-3 rounded-2xl">
                <img src={qr} alt="رمز QR للدعوة" className="w-44 h-44" />
              </div>
            )}
            <p className="text-slate-500 text-xs text-center">
              امسح الرمز بكاميرا الهاتف للانضمام مباشرة
            </p>
          </div>

          {/* Code */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl py-3 text-center">
            <p className="text-slate-500 text-xs mb-1">رمز الدعوة</p>
            <p className="text-white font-mono tracking-[0.3em] text-xl font-bold">{code}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Share2 size={16} />
              مشاركة
            </button>
            <button
              onClick={handleCopy}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              {copied ? <><Check size={16} className="text-emerald-400" /> تم النسخ</> : <><Copy size={16} /> نسخ الرابط</>}
            </button>
          </div>

          <p className="text-slate-600 text-xs text-center">
            الرابط صالح لمدة 7 أيام أو 20 استخداماً
          </p>
        </div>
      )}
    </Modal>
  );
}
