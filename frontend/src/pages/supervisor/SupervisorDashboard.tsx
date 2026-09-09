import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { supervisorApi } from '../../api/supervisor';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { StatCard } from '../../components/shared/StatCard';
import { SkeletonCards } from '../../components/ui/Skeleton';

export function SupervisorDashboard(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(supervisorApi.getDashboard);

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your assigned scholars and pending work." />
      {loading && <SkeletonCards count={6} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Assigned Students" value={data.assignedStudents} sub="scholars under supervision" to="/supervisor/students" />
          <StatCard label="Pending Approvals" value={data.pendingApprovals} sub="awaiting your review" to="/supervisor/approvals" />
          <StatCard label="Upcoming Events" value={data.upcomingEvents} sub="events you organized" to="/supervisor/events" />
          <StatCard label="Pending Course Approvals" value={data.pendingCourseApprovals} sub="course requests" />
          <StatCard label="Pending Thesis Approvals" value={data.pendingThesisApprovals} sub="thesis submissions" />
          <StatCard label="Pending General Approvals" value={data.pendingGeneralApprovals} sub="general requests" />
        </div>
      )}
    </>
  );
}

export default SupervisorDashboard;
