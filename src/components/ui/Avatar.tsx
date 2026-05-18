import { useState } from 'react';

interface AvatarProps {
  uid?: string;
  name: string;
  photoURL?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const COLORS = [
  'bg-emerald-500/20 text-emerald-300',
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-pink-500/20 text-pink-300',
  'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300',
  'bg-cyan-500/20 text-cyan-300',
  'bg-indigo-500/20 text-indigo-300',
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function Avatar({ uid, name, photoURL, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const colorClass = COLORS[hashString(uid || name || '?') % COLORS.length];

  if (photoURL && !failed) {
    return (
      <img
        src={photoURL}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${className}`}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
