const badgeDefaultClass =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700';

interface BadgeProps {
  label: string;
  className?: string;
}

export function Badge({ label, className }: BadgeProps) {
  return <span className={className ?? badgeDefaultClass}>{label}</span>;
}

export default Badge;