import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

const alertVariants = {
  info: 'rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700',
  success: 'rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700',
  error: 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700',
  warning: 'rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700',
} as const;

interface AlertProps {
  variant?: keyof typeof alertVariants;
  children: ReactNode;
  onDismiss?: () => void;
}

export function Alert({ variant = 'info', children, onDismiss }: AlertProps) {
  return (
    <div role="alert" className={cn(alertVariants[variant], 'relative', onDismiss ? 'pr-8' : undefined)}>
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 inline-flex items-center justify-center rounded p-1 text-current opacity-70 hover:opacity-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Alert;