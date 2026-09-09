import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub: string;
  to?: string;
}

export function StatCard({ label, value, sub, to }: StatCardProps) {
  const content = (
    <Card>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </Card>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

export default StatCard;