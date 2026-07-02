interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-800 rounded-xl ${className}`} />
  );
}

export function ExpenseSkeleton() {
  return (
    <div className="card p-4 flex items-start gap-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-6 w-24 mt-2" />
      </div>
    </div>
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
