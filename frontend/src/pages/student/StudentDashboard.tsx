import { useMemo } from 'react';
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
  formatFaculty,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLE,
  THESIS_STATUS_LABELS,
  THESIS_STATUS_STYLE,
  TIMELINE_SEVERITY_STYLE,
} from '../../utils/constants';

export function StudentDashboard(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(studentApi.getDashboard);

  const { completedMilestones, totalMilestones, milestonePercentage } = useMemo(() => {
    const total = data?.milestones.length || 11;
    const completed = data?.milestones.filter((m) => m.status === 'completed').length ?? 0;
    return {
      completedMilestones: completed,
      totalMilestones: total,
      milestonePercentage: Math.min(100, Math.round((completed / total) * 100)),
    };
  }, [data?.milestones]);

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
      {!loading && !error && data && data.profile.supervisor && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-green-900">
            <span className="font-semibold text-green-950">Supervisor:</span> {formatFaculty(data.profile.supervisor)}
            {data.profile.coSupervisor ? (
              <> · <span className="font-semibold text-green-950">Co-supervisor:</span> {formatFaculty(data.profile.coSupervisor)}</>
            ) : null}
          </p>
          <Link to="/student/profile" className="text-xs font-medium text-green-700 hover:text-green-800 underline">
            View full profile →
          </Link>
        </div>
      )}

      {/* 8-Year Registration Validity Status */}
      {!loading && !error && data?.validity && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">PhD Registration Validity:</span>
            {data.validity.status === 'expired' ? (
              <span className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-800">Expired (Exceeded 8 Years)</span>
            ) : data.validity.status === 'expiring_soon' ? (
              <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Expiring Soon ({data.validity.daysRemaining} days left)</span>
            ) : (
              <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-800">Active ({data.validity.daysRemaining} days remaining · 8-Yr Max)</span>
            )}
          </div>
          <span>Enrolled: {formatDate(data.validity.admissionDate)} · Expiry: {formatDate(data.validity.expiryDate)}</span>
        </div>
      )}

      {/* Ordinance Timeline Alerts & Dues */}
      {!loading && !error && data?.ordinanceAlerts && data.ordinanceAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.ordinanceAlerts.map((alert) => {
            const style = TIMELINE_SEVERITY_STYLE[alert.severity] || TIMELINE_SEVERITY_STYLE.info;
            return (
              <div
                key={alert.code}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border px-4 py-3 ${style.border} ${style.bg} ${style.text}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={style.badge}>{alert.title}</span>
                    {alert.dueDate && (
                      <span className="text-xs opacity-75">Target: {formatDate(alert.dueDate)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{alert.message}</p>
                </div>
                {alert.actionLink && (
                  <Link
                    to={alert.actionLink}
                    aria-label={`Take action: ${alert.title}`}
                    className="shrink-0 text-xs font-semibold underline underline-offset-2 hover:opacity-80"
                  >
                    Take Action →
                  </Link>
                )}
              </div>
            );
          })}
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
              sub={`${data.credits.required - data.credits.earned} credits remaining`}
              to="/student/credits"
            />
            <StatCard
              label="Milestones"
              value={
                <>
                  {completedMilestones} <span className="text-sm font-normal text-gray-500">/ {totalMilestones}</span>
                </>
              }
              sub="stages completed"
              to="/student/milestones"
            />
            <StatCard
              label="Thesis"
              value={data.thesis ? THESIS_STATUS_LABELS[data.thesis.status] : 'Not submitted'}
              sub={data.thesis ? `Version ${data.thesis.version}` : 'ready when you are'}
              to="/student/thesis"
            />
            <StatCard
              label="Notifications"
              value={data.unreadNotifications}
              sub={data.unreadNotifications === 1 ? 'unread update' : 'unread updates'}
              to="/student/notifications"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current supervisor</p>
              {data.profile.supervisor ? (
                <div className="mt-2">
                  <p className="text-lg font-medium text-gray-900">{formatFaculty(data.profile.supervisor)}</p>
                  {data.profile.coSupervisor && (
                    <p className="mt-1 text-sm text-gray-600">
                      Co-supervisor: {formatFaculty(data.profile.coSupervisor)}
                    </p>
                  )}
                  {data.profile.supervisor.department && (
                    <p className="text-sm text-gray-500">{data.profile.supervisor.department}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Awaiting supervisor assignment.</p>
              )}
            </Card>

            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next milestone</p>
              {data.nextMilestone ? (
                <div className="mt-2">
                  <p className="font-medium text-gray-900">{data.nextMilestone.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      label={MILESTONE_STATUS_LABELS[data.nextMilestone.status]}
                      className={MILESTONE_STATUS_STYLE[data.nextMilestone.status]}
                    />
                    {data.nextMilestone.dueDate && (
                      <span className="text-xs text-gray-500">Due {formatDate(data.nextMilestone.dueDate)}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">All milestones completed.</p>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Milestones progress</h2>
              <ButtonLink to="/student/milestones" variant="secondary" size="sm">
                View all
              </ButtonLink>
            </div>
            <div
              className="mt-4 h-2 rounded bg-gray-200"
              role="progressbar"
              aria-label="Milestones progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={milestonePercentage}
              aria-valuetext={`${completedMilestones} of ${totalMilestones} milestones completed`}
            >
              <div
                className="h-2 rounded bg-blue-600"
                style={{ width: `${milestonePercentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">{completedMilestones} of {totalMilestones} milestones completed</p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Upcoming Deadlines" padded={false}>
              {data.upcomingDeadlines.length === 0 ? (
                <EmptyState title="No upcoming deadlines" message="You are all caught up." />
              ) : (
                <Table
                  ariaLabel="Upcoming Deadlines"
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
                ariaLabel="Pending Course Requests"
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

export default StudentDashboard;