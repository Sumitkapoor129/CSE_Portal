import type { JSX } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { formatDateTime } from '../../utils/formatDate';
import type { Notification } from '../../types';

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

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
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
                  className={`w-full px-6 py-4 text-left transition-colors hover:bg-gray-50 ${
                    notification.isRead ? '' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    {!notification.isRead && <span className="sr-only">Unread</span>}
                    <p className={`text-sm ${notification.isRead ? 'font-medium text-gray-900' : 'font-semibold text-gray-900'}`}>
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-gray-500">{formatDateTime(notification.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                  {notification.link && <p className="mt-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700">Open</p>}
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