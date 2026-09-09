import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { StatCard } from '../../components/shared/StatCard';
import { ButtonLink } from '../../components/ui/Button';
import { SkeletonCards } from '../../components/ui/Skeleton';

export function AdminDashboard(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(adminApi.getDashboard);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of students, faculty, events, and pending work."
        actions={
          <>
            <ButtonLink to="/admin/students?create=1">Create Student</ButtonLink>
            <ButtonLink to="/admin/faculty?create=1" variant="secondary">
              Create Faculty
            </ButtonLink>
            <ButtonLink to="/admin/events" variant="secondary">
              Create Event
            </ButtonLink>
            <ButtonLink to="/admin/deadlines" variant="secondary">
              Create Deadline
            </ButtonLink>
          </>
        }
      />
      {loading && <SkeletonCards count={4} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Students" value={data.totalStudents} sub="registered scholars" to="/admin/students" />
          <StatCard label="Total Faculty" value={data.totalFaculty} sub="supervisors on record" to="/admin/faculty" />
          <StatCard label="Total Events" value={data.totalEvents} sub="events scheduled" to="/admin/events" />
          <StatCard label="Pending Approvals" value={data.pendingApprovals} sub="awaiting review" />
        </div>
      )}
    </>
  );
}

export default AdminDashboard;