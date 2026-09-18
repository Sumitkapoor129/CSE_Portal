import { useState } from 'react';
import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Card } from '../../components/ui/Card';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { DueDateCell } from '../../components/student/DueDateCell';
import { formatDate } from '../../utils/formatDate';

export function StudentDeadlines(): JSX.Element {
  const { user } = useAuth();
  const [active, setActive] = useState<'upcoming' | 'all'>('upcoming');
  const { data, loading, error, refetch } = useApi(
    (opts) => studentApi.getDeadlines(active === 'upcoming' ? true : undefined, opts),
    [active]
  );

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const deadlines = data ?? [];

  return (
    <>
      <PageHeader title="Deadlines" description="Submission deadlines relevant to you." />
      <Tabs
        tabs={[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'all', label: 'All' },
        ]}
        active={active}
        onChange={(key) => setActive(key as 'upcoming' | 'all')}
      />
      <div className="mt-6">
        {loading && <SkeletonTable rows={4} />}
        {error && !loading && <QueryError error={error} onRetry={refetch} />}
        {!loading && !error && (
          <Card padded={false}>
            <Table
              columns={[
                { key: 'title', header: 'Title' },
                { key: 'description', header: 'Description' },
                { key: 'due', header: 'Due Date' },
                { key: 'days', header: 'Days Remaining' },
              ]}
            >
              {deadlines.length === 0 ? (
                <TableEmpty colSpan={4} message="No deadlines found." />
              ) : (
                deadlines.map((deadline) => (
                  <TableRow key={deadline._id}>
                    <TableCell className="font-medium text-gray-900">{deadline.title}</TableCell>
                    <TableCell className="text-gray-500">{deadline.description || '—'}</TableCell>
                    <TableCell className="text-gray-500">{formatDate(deadline.dueDate)}</TableCell>
                    <TableCell>
                      <DueDateCell date={deadline.dueDate} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}

export default StudentDeadlines;