import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  title?: string;
  actions?: ReactNode;
  padded?: boolean;
  children: ReactNode;
  className?: string;
}

export function Card({ title, actions, padded = true, children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white', padded ? 'p-6' : 'p-0', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;