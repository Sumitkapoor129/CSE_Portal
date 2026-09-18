import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Column {
  key: string;
  header: string;
  className?: string;
}

interface TableProps {
  columns: Column[];
  children: ReactNode;
  ariaLabel?: string;
}

export function Table({ columns, children, ariaLabel }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

interface TableRowProps {
  children: ReactNode;
}

export function TableRow({ children }: TableRowProps) {
  return <tr className="border-b border-gray-100 hover:bg-gray-50">{children}</tr>;
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
}

export function TableCell({ children, className }: TableCellProps) {
  return <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>;
}

interface TableEmptyProps {
  colSpan: number;
  message?: string;
}

export function TableEmpty({ colSpan, message = 'No records found' }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-gray-500">
        {message}
      </td>
    </tr>
  );
}

export default Table;