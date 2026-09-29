import type { JSX } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { formatDateTime } from '../../utils/formatDate';
import { REMINDER_SEVERITY_STYLE } from '../../utils/constants';
import type { Notification } from '../../types';

function severityDot(severity?: string): string {
  if (!severity) return 'bg-gray-300';
  return REMINDER_SEVERITY_STYLE[severity as keyof typeof REMINDER_SEVERITY_STYLE]?.dot ?? 'bg-gray-300';
}

function severityBorder(severity?: string): string {
  if (!severity) return 'border-l-transparent';
  return REMINDER_SEVERITY_STYLE[severity as keyof typeof REMINDER_SEVERITY_STYLE]?.border ?? 'border-l-transparent';
}

function daysRemainingText(value: number): string {
  if (value < 0) return `${Math.abs(value)} days overdue`;
  if (value === 0) return 'Due today';
  if (value === 1) return '1 day remaining';
  return `${value} days remaining`;
}

export function StudentNotifications(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(studentApi.getNotifications);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const notifications = data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const handleOpen = async (notification: Notification) => {
    if (!notification.isRead) {
      await studentApi.markNotificationRead(notification._id).catch(() => undefined);
    }
    refetch();
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await studentApi.markAllNotificationsRead();
      refetch();
    } catch {
      // Ignore — the action is non-blocking.
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      {loading && <SkeletonTable rows={5} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && notifications.length === 0 && (
        <Card padded={false}>
          <EmptyState title="No notifications" message="You have no notifications right now." />
        </Card>
      )}
      {!loading && !error && notifications.length > 0 && (
        <Card padded={false}>
          <ul className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <li key={notification._id}>
                <button
                  type="button"
                  onClick={() => handleOpen(notification)}
                  className={`w-full border-l-2 px-6 py-4 text-left transition-colors hover:bg-gray-50 ${
                    notification.isRead ? '' : 'bg-blue-50'
                  } ${severityBorder(notification.severity)}`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      {!notification.isRead && <span className="sr-only">Unread</span>}
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${severityDot(notification.severity)}`}
                      />
                      <span className="sr-only">Severity: {notification.severity ?? 'none'}</span>
                      <p className={`truncate text-sm ${notification.isRead ? 'font-medium text-gray-900' : 'font-semibold text-gray-900'}`}>
                        {notification.title}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{formatDateTime(notification.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                  {notification.daysRemaining != null && (
                    <p className="mt-1 text-xs text-gray-500">• {daysRemainingText(notification.daysRemaining)}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export default StudentNotifications;