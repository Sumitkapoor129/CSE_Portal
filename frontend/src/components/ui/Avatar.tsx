import { useState } from 'react';
import type { JSX } from 'react';
import { cn } from '../../utils/cn';

const SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const;

interface AvatarProps {
  name: string;
  photo?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

export function Avatar({ name, photo, size = 'md', className }: AvatarProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt=""
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white', SIZES[size], className)}
    >
      {initials(name) || '?'}
    </div>
  );
}

export default Avatar;