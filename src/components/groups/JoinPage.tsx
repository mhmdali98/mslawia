import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroups } from '../../hooks/useGroups';
import { useStore } from '../../store/useStore';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { joinByInvite } = useGroups();
  const { user } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'joining' | 'done' | 'error'>('joining');

  useEffect(() => {
    if (!code || !user) return;
    joinByInvite(code.toUpperCase()).then(ok => {
      setStatus(ok ? 'done' : 'error');
      setTimeout(() => navigate('/'), 1500);
    });
  }, [code, user]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-sm w-full">
        {status === 'joining' && (
          <>
            <LoadingSpinner size="lg" />
            <p className="text-slate-300 mt-4">جارٍ الانضمام للمجموعة...</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold">تم الانضمام بنجاح!</p>
            <p className="text-slate-400 text-sm mt-1">جارٍ التوجيه...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <p className="text-white font-semibold">رمز الدعوة غير صالح</p>
            <p className="text-slate-400 text-sm mt-1">جارٍ التوجيه...</p>
          </>
        )}
      </div>
    </div>
  );
}
