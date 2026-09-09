import { useState } from 'react';
import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import { EVENT_TYPE_LABELS } from '../../utils/constants';

export function StudentEvents(): JSX.Element {
  const { user } = useAuth();
  const [active, setActive] = useState<'upcoming' | 'all'>('upcoming');
  const { data, loading, error, refetch } = useApi(
    () => studentApi.getEvents(active === 'upcoming' ? true : undefined),
    [active]
  );

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const events = data ?? [];

  return (
    <>
      <PageHeader title="Events" description="Academic events you are registered for." />
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
                { key: 'type', header: 'Type' },
                { key: 'date', header: 'Date' },
                { key: 'location', header: 'Location' },
                { key: 'organizer', header: 'Organizer' },
              ]}
            >
              {events.length === 0 ? (
                <TableEmpty colSpan={5} message="No events scheduled." />
              ) : (
                events.map((event) => (
                  <TableRow key={event._id}>
                    <TableCell className="font-medium text-gray-900">{event.title}</TableCell>
                    <TableCell>
                      <Badge label={EVENT_TYPE_LABELS[event.eventType]} />
                    </TableCell>
                    <TableCell className="text-gray-500">{formatDate(event.date)}</TableCell>
                    <TableCell className="text-gray-700">{event.location || '—'}</TableCell>
                    <TableCell className="text-gray-700">
                      {typeof event.organizer === 'string' ? event.organizer : event.organizer.name}
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

export default StudentEvents;