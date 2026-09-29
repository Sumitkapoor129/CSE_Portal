import type { JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { supervisorApi } from '../../api/supervisor';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';

export function SupervisorDashboard(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(supervisorApi.getDashboard);

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const dues = data?.duesSummary?.dues || [];
  const criticalCount = data?.duesSummary?.criticalCount || 0;
  const warningCount = data?.duesSummary?.warningCount || 0;

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your assigned scholars, timeline dues, and pending work." />
      {loading && (
        <div className="space-y-6">
          <SkeletonCards count={4} />
          <SkeletonTable rows={4} />
        </div>
      )}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Scholar Overview & Timelines
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Assigned Students" value={data.assignedStudents} sub="scholars under supervision" to="/supervisor/students" />
              <StatCard label="Pending Approvals" value={data.pendingApprovals} sub="awaiting your review" to="/supervisor/approvals" />
              <StatCard
                label="Overdue Milestone Dues"
                value={<span className={criticalCount > 0 ? 'text-red-700' : undefined}>{criticalCount}</span>}
                sub={criticalCount > 0 ? 'scholars past deadline' : 'all on schedule'}
              />
              <StatCard
                label="Upcoming Milestones"
                value={warningCount}
                sub="due within warning window"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Pending Workflows
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Course Approvals" value={data.pendingCourseApprovals} sub="pending requests" to="/supervisor/approvals" />
              <StatCard label="Thesis Approvals" value={data.pendingThesisApprovals} sub="thesis submissions" to="/supervisor/approvals" />
              <StatCard label="General Approvals" value={data.pendingGeneralApprovals} sub="general requests" to="/supervisor/approvals" />
              <StatCard label="Upcoming Events" value={data.upcomingEvents} sub="events you organized" to="/supervisor/events" />
            </div>
          </div>

          {/* Scholars' Timeline Dues Section */}
          <Card title="Scholars' Ordinance Timeline Dues & Alerts" padded={false}>
            {dues.length === 0 ? (
              <EmptyState
                title="All scholars are on track"
                message="No scholars currently have overdue or urgent ordinance milestone deadlines."
              />
            ) : (
              <Table
                ariaLabel="Scholars Ordinance Timeline Dues and Alerts"
                columns={[
                  { key: 'scholar', header: 'Scholar' },
                  { key: 'milestone', header: 'Due Milestone / Task' },
                  { key: 'deadline', header: 'Ordinance Target' },
                  { key: 'status', header: 'Timeline Status' },
                  { key: 'action', header: 'Required Action' },
                ]}
              >
                {dues.map((due) => (
                  <TableRow key={`${due.studentId}-${due.dueMilestone}`}>
                    <TableCell>
                      <div>
                        <Link
                          to={`/supervisor/students/${due.studentId}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {due.studentName}
                        </Link>
                        <p className="text-xs text-gray-500">Roll: {due.rollNumber} · {due.department}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{due.dueMilestone}</TableCell>
                    <TableCell className="text-gray-600">
                      {due.dueDate ? formatDate(due.dueDate) : 'Immediate'}
                    </TableCell>
                    <TableCell>
                      {due.status === 'overdue' ? (
                        <Badge
                          label={`${Math.abs(due.daysDiff)}d overdue`}
                          className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                        />
                      ) : (
                        <Badge
                          label={`Due in ${due.daysDiff}d`}
                          className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/supervisor/students/${due.studentId}`}
                        aria-label={`${due.action} for ${due.studentName}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                      >
                        {due.action} →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

export default SupervisorDashboard;
