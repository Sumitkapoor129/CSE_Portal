import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;