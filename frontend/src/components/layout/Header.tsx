import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { MobileNav } from './MobileNav';

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

  const initials = user ? user.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() : '';

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
    } catch {
      setSubmitting(false);
      setPwError('Unable to change password. Please check your current password and try again.');
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <MobileNav />

      {user && (
        <div className="relative" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initials}
            </div>
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
            <div ref={menuPanelRef} tabIndex={-1} className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none">
              <button
                type="button"
                onClick={openChangePassword}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={changePasswordOpen} onClose={closeChangePassword} title="Change Password" maxWidth="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {pwError && <Alert variant="error">{pwError}</Alert>}
          {pwSuccess && <Alert variant="success">{pwSuccess}</Alert>}
          <Input
            id="current-password"
            label="Current Password"
            type="password"
            value={form.currentPassword}
            onChange={handleFieldChange('currentPassword')}
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
          />
          <Input
            id="new-password"
            label="New Password"
            type="password"
            value={form.newPassword}
            onChange={handleFieldChange('newPassword')}
            error={fieldErrors.newPassword}
            hint="At least 8 characters."
            autoComplete="new-password"
          />
          <Input
            id="confirm-password"
            label="Confirm New Password"
            type="password"
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