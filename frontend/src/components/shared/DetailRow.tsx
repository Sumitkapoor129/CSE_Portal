import type { ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default DetailRow;