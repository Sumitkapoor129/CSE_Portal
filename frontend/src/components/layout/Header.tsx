import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { studentApi } from '../../api/student';
import { useAuth } from '../../context/AuthContext';
import { REMINDER_SEVERITY_STYLE, ROLE_LABELS } from '../../utils/constants';
import { applyServerError } from '../../utils/errors';
import { formatDate } from '../../utils/formatDate';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PasswordInput } from '../ui/PasswordInput';
import { MobileNav } from './MobileNav';
import type { Notification } from '../../types';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const emptyForm: PasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

function severityDotClass(severity?: string): string {
  if (!severity) return 'bg-gray-300';
  return REMINDER_SEVERITY_STYLE[severity as keyof typeof REMINDER_SEVERITY_STYLE]?.dot ?? 'bg-gray-300';
}

function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function Header(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [form, setForm] = useState<PasswordForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadEndpoint, setUnreadEndpoint] = useState<number | null>(null);
  const listFetchedRef = useRef(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  // Prefer the cheap endpoint count for the badge; fall back to the derived
  // count from the loaded list when the endpoint is unavailable.
  const badgeCount = unreadEndpoint ?? unreadCount;

  const fetchNotificationList = useCallback(() => {
    const controller = new AbortController();
    setNotifLoading(true);
    studentApi
      .getNotifications({ signal: controller.signal })
      .then((items) => {
        setNotifications(items ?? []);
        setUnreadEndpoint((items ?? []).filter((n) => !n.isRead).length);
      })
      .catch(() => undefined)
      .finally(() => setNotifLoading(false));
    return () => controller.abort();
  }, []);

  // On mount fetch ONLY the unread count (cheap) for the badge. If the
  // endpoint errors (e.g. during rollout), the badge falls back to hidden/0
  // and the full list still loads on first open.
  useEffect(() => {
    if (user?.role !== 'student') return;
    const controller = new AbortController();
    studentApi
      .getUnreadNotificationCount({ signal: controller.signal })
      .then((res) => {
        if (typeof res?.unread === 'number') setUnreadEndpoint(res.unread);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [user?.role]);

  const handleNotifToggle = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && !listFetchedRef.current) {
      listFetchedRef.current = true;
      fetchNotificationList();
    }
  };

  useEffect(() => {
    if (!notifOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifOpen(false);
        notifTriggerRef.current?.focus();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  useEffect(() => {
    if (notifOpen) notifPanelRef.current?.focus();
  }, [notifOpen]);

  const handleMarkAllRead = async () => {
    try {
      await studentApi.markAllNotificationsRead();
      setUnreadEndpoint(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      fetchNotificationList();
    } catch {
      // Ignore — the bell should never block the header.
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      void studentApi.markNotificationRead(notification._id).catch(() => undefined);
      setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)));
      fetchNotificationList();
    }
    setNotifOpen(false);
    navigate(notification.link || '/student/milestones');
  };

  const closeMenu = () => {
    setMenuOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) menuPanelRef.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleFieldChange = (field: keyof PasswordForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openChangePassword = () => {
    closeMenu();
    setForm(emptyForm);
    setFieldErrors({});
    setPwError(null);
    setPwSuccess(null);
    setChangePasswordOpen(true);
  };

  const closeChangePassword = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setChangePasswordOpen(false);
    setPwError(null);
    setPwSuccess(null);
    setForm(emptyForm);
    setFieldErrors({});
    setSubmitting(false);
  };

  const handleSignOut = () => {
    closeMenu();
    logout();
    navigate('/auth/login', { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    if (!form.currentPassword) errors.currentPassword = 'Current password is required.';
    if (!form.newPassword) errors.newPassword = 'New password is required.';
    else if (form.newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters.';
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your new password.';
    else if (form.newPassword !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setPwError(null);
    setPwSuccess(null);
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword);
      setSubmitting(false);
      setPwSuccess('Password changed successfully.');
      setForm(emptyForm);
      closeTimerRef.current = window.setTimeout(() => {
        closeChangePassword();
      }, 1400);
    } catch (err) {
      setSubmitting(false);
      applyServerError(err, setFieldErrors, setPwError);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <MobileNav />

      {user && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 sm:hidden"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>

          {user.role === 'student' && (
            <div className="relative" ref={notifRef}>
              <button
                ref={notifTriggerRef}
                type="button"
                onClick={handleNotifToggle}
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
                aria-label={`Notifications${badgeCount > 0 ? ` (${badgeCount} unread)` : ''}`}
                className="relative inline-flex items-center justify-center rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  ref={notifPanelRef}
                  tabIndex={-1}
                  className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg outline-none"
                >
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-2 text-xs font-medium text-gray-500">({unreadCount} unread)</span>
                      )}
                    </p>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifLoading && notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-500">Loading…</p>
                    ) : notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-500">No notifications</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {notifications.slice(0, 8).map((notification) => (
                          <li key={notification._id}>
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(notification)}
                              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                                notification.isRead ? '' : 'bg-blue-50'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDotClass(notification.severity)}`}
                              />
                              <span className="sr-only">Severity: {notification.severity ?? 'none'}</span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block text-sm ${
                                    notification.isRead ? 'font-medium text-gray-900' : 'font-semibold text-gray-900'
                                  }`}
                                >
                                  {notification.title}
                                </span>
                                <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500">{notification.message}</span>
                              </span>
                              <span className="shrink-0 text-xs text-gray-500">{timeAgo(notification.createdAt)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border-t border-gray-200 px-4 py-2">
                    <Link
                      to="/student/notifications"
                      onClick={() => {
                        setNotifOpen(false);
                        fetchNotificationList();
                      }}
                      className="block rounded py-1 text-center text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-label="User account menu"
              className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-100"
            >
              <Avatar name={user.name} photo={user.profilePhoto ?? null} size="sm" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
              </div>
              <svg
                className="hidden h-4 w-4 text-gray-500 sm:block"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div ref={menuPanelRef} tabIndex={-1} className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none">
                <button
                  type="button"
                  onClick={openChangePassword}
                  className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={changePasswordOpen} onClose={closeChangePassword} title="Change Password" maxWidth="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {pwError && <Alert variant="error">{pwError}</Alert>}
          {pwSuccess && <Alert variant="success">{pwSuccess}</Alert>}
          <PasswordInput
            id="current-password"
            label="Current Password"
            value={form.currentPassword}
            onChange={handleFieldChange('currentPassword')}
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
          />
          <PasswordInput
            id="new-password"
            label="New Password"
            value={form.newPassword}
            onChange={handleFieldChange('newPassword')}
            error={fieldErrors.newPassword}
            hint="At least 8 characters."
            autoComplete="new-password"
          />
          <PasswordInput
            id="confirm-password"
            label="Confirm New Password"
            value={form.confirmPassword}
            onChange={handleFieldChange('confirmPassword')}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeChangePassword} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
}