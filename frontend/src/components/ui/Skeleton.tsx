import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded bg-gray-200', className)} />;
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div role="status" aria-live="polite" className="w-full">
      <div className="flex gap-4 border-b border-gray-200 px-4 pb-4 pt-4">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-4 border-b border-gray-100 px-4 py-4">
          {Array.from({ length: columns }, (_, cellIndex) => (
            <Skeleton key={cellIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonCardsProps {
  count?: number;
}

export function SkeletonCards({ count = 3 }: SkeletonCardsProps) {
  return (
    <div role="status" aria-live="polite" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white p-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;