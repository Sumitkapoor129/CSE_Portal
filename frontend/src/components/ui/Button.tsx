import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50 transition-colors';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
    >
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ to, variant = 'primary', size = 'md', className, children }: ButtonLinkProps) {
  return (
    <Link to={to} className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}>
      {children}
    </Link>
  );
}

export default Button;