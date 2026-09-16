import type { JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableRow } from '../../components/ui/Table';
import { DueDateCell } from '../../components/student/DueDateCell';
import { formatDate } from '../../utils/formatDate';
import {
  EVENT_TYPE_LABELS,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLE,
  THESIS_STATUS_LABELS,
  THESIS_STATUS_STYLE,
} from '../../utils/constants';

export function StudentDashboard(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(studentApi.getDashboard);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={data ? `Welcome, ${data.profile.user.name}.` : 'Your academic overview.'}
      />
      {!loading && !error && data && !data.profile.isProfileComplete && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Your profile is incomplete.{' '}
            <Link to="/student/complete-profile" className="font-medium underline underline-offset-2">
              Complete your profile
            </Link>{' '}
            to get started.
          </p>
        </div>
      )}
      {!loading && !error && data && !data.profile.supervisor && (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">Awaiting supervisor assignment.</p>
        </div>
      )}
      {loading && (
        <div className="space-y-6">
          <SkeletonCards count={4} />
          <SkeletonTable rows={4} />
        </div>
      )}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Credits"
              value={
                <>
                  {data.credits.earned} <span className="text-sm font-normal text-gray-500">/ {data.credits.required}</span>
                </>
              }
              sub={`${data.credits.remaining} credits remaining`}
            />
            <StatCard
              label="Milestones"
              value={
                <>
                  {completedCount(data.milestones)}{' '}
                  <span className="text-sm font-normal text-gray-500">/ 11</span>
                </>
              }
              sub="milestones completed"
            />
            <StatCard label="Upcoming Deadlines" value={data.upcomingDeadlines.length} sub="due soon" />
            <StatCard
              label="Unread Notifications"
              value={
                <Link to="/student/notifications" className="text-blue-600 hover:text-blue-700">
                  {data.unreadNotifications}
                </Link>
              }
              sub="need attention"
            />
          </div>

          <Card>
            {data.nextMilestone ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next milestone</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{data.nextMilestone.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{data.nextMilestone.description}</p>
                </div>
                <Badge
                  label={MILESTONE_STATUS_LABELS[data.nextMilestone.status]}
                  className={MILESTONE_STATUS_STYLE[data.nextMilestone.status]}
                />
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next milestone</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">All milestones completed</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Milestones progress</h2>
              <ButtonLink to="/student/milestones" variant="secondary" size="sm">
                View all
              </ButtonLink>
            </div>
            <div className="mt-4 h-2 rounded bg-gray-200">
              <div
                className="h-2 rounded bg-blue-600"
                style={{ width: `${Math.min(100, Math.round((completedCount(data.milestones) / 11) * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">{completedCount(data.milestones)} of 11 milestones completed</p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Upcoming Deadlines" padded={false}>
              {data.upcomingDeadlines.length === 0 ? (
                <EmptyState title="No upcoming deadlines" message="You are all caught up." />
              ) : (
                <Table
                  columns={[
                    { key: 'title', header: 'Title' },
                    { key: 'due', header: 'Due date' },
                    { key: 'days', header: 'Days left' },
                  ]}
                >
                  {data.upcomingDeadlines.map((deadline) => (
                    <TableRow key={deadline._id}>
                      <TableCell className="font-medium text-gray-900">{deadline.title}</TableCell>
                      <TableCell className="text-gray-500">{formatDate(deadline.dueDate)}</TableCell>
                      <TableCell>
                        <DueDateCell date={deadline.dueDate} />
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}
            </Card>

            <Card title="Upcoming Events" padded={false}>
              {data.upcomingEvents.length === 0 ? (
                <EmptyState title="No upcoming events" message="Nothing scheduled right now." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.upcomingEvents.map((event) => (
                    <li key={event._id} className="flex items-center justify-between gap-4 px-6 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                      </div>
                      <Badge label={EVENT_TYPE_LABELS[event.eventType]} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {data.pendingCourseRequests.length > 0 && (
            <Card title="Pending Course Requests" padded={false}>
              <Table
                columns={[
                  { key: 'course', header: 'Course' },
                  { key: 'code', header: 'Code' },
                  { key: 'credits', header: 'Credits' },
                ]}
              >
                {data.pendingCourseRequests.map((item) => {
                  const course = typeof item.course === 'object' ? item.course : null;
                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium text-gray-900">{course?.courseName ?? '—'}</TableCell>
                      <TableCell className="text-gray-500">{course?.courseCode ?? '—'}</TableCell>
                      <TableCell className="text-gray-700">{course?.credits ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Thesis</p>
                {data.thesis ? (
                  <>
                    <p className="mt-1 truncate text-sm font-medium text-gray-900">{data.thesis.title}</p>
                    <p className="text-xs text-gray-500">Version {data.thesis.version}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">No thesis submitted yet.</p>
                )}
              </div>
              {data.thesis && (
                <Badge
                  label={THESIS_STATUS_LABELS[data.thesis.status]}
                  className={THESIS_STATUS_STYLE[data.thesis.status]}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function completedCount(milestones: { status: string }[]): number {
  return milestones.filter((milestone) => milestone.status === 'completed').length;
}

export default StudentDashboard;