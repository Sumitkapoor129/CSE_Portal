import type { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

const errorInputClass =
  'block w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ id, label, error, hint, className, ...rest }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(error ? errorInputClass : inputClass, className)}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Input;