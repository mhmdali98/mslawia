import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinByInvite } from '../../lib/actions';
import { useStore } from '../../store/useStore';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const user = useStore(s => s.user);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'joining' | 'error'>('joining');
  const attempted = useRef(false);

  useEffect(() => {
    if (!code || !user || attempted.current) return;
    attempted.current = true; // guard against double-invocation (StrictMode / re-renders)
    joinByInvite(code.toUpperCase()).then(groupId => {
      if (groupId) {
        // straight into the group — the success toast is confirmation enough
        navigate(`/group/${groupId}`, { replace: true });
      } else {
        setStatus('error');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      }
    });
  }, [code, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-sm w-full">
        {status === 'joining' && (
          <>
            <LoadingSpinner size="lg" />
            <p className="text-slate-300 mt-4">جارٍ الانضمام للمجموعة...</p>
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
