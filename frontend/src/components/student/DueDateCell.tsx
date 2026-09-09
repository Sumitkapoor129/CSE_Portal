import { daysUntil, formatDate } from '../../utils/formatDate';

interface DueDateCellProps {
  date: string;
  variant?: 'days-left' | 'overdue-count';
}

export function DueDateCell({ date, variant = 'days-left' }: DueDateCellProps) {
  const days = daysUntil(date);
  if (variant === 'overdue-count') {
    if (days === null) return '—';
    if (days < 0) return <span className="font-medium text-red-600">Overdue by {Math.abs(days)}d</span>;
    if (days === 0) return <span className="font-medium text-amber-600">Due today</span>;
    return <span className="text-gray-700">In {days}d</span>;
  }
  if (days === null) {
    return <span className="text-gray-500">{formatDate(date)}</span>;
  }
  if (days < 0) {
    return <span className="font-medium text-red-600">Overdue</span>;
  }
  if (days === 0) {
    return <span className="font-medium text-gray-900">Due today</span>;
  }
  return <span className="text-gray-700">{days} day{days === 1 ? '' : 's'} left</span>;
}

export default DueDateCell;