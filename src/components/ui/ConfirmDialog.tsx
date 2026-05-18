import { AlertTriangle } from 'lucide-react';
import { useConfirm } from '../../store/useConfirm';

export function ConfirmDialog() {
  const { options, respond } = useConfirm();
  if (!options) return null;

  const isDanger = options.variant === 'danger';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          {isDanger && (
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg leading-tight">{options.title}</h3>
            {options.description && (
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{options.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => respond(false)}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
          >
            {options.cancelLabel || 'إلغاء'}
          </button>
          <button
            onClick={() => respond(true)}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {options.confirmLabel || 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  );
}
