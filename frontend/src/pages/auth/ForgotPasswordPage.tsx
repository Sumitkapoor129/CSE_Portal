import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { applyServerError } from '../../utils/errors';
import { required, validateEmail } from '../../utils/validators';

interface FieldErrors {
  email?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ForgotPasswordPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
    if (serverError) setServerError(null);
  };

  const handleOtpChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOtp(event.target.value);
    if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
    if (serverError) setServerError(null);
  };

  const handleNewPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewPassword(event.target.value);
    if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
    if (serverError) setServerError(null);
  };

  const handleConfirmPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    if (serverError) setServerError(null);
  };

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    const trimmedEmail = email.trim();
    if (!required(trimmedEmail)) {
      errors.email = 'Email is required.';
    } else if (!validateEmail(trimmedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    setFieldErrors({});

    try {
      const res = await authApi.forgotPassword(trimmedEmail);
      setStep(2);
      setInfoMessage(res.message || `A password reset code has been sent to ${trimmedEmail}.`);
    } catch (err) {
      applyServerError(err, setFieldErrors, setServerError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setResending(true);
    setServerError(null);

    try {
      const res = await authApi.forgotPassword(trimmedEmail);
      setInfoMessage(res.message || `A new password reset code has been sent to ${trimmedEmail}.`);
    } catch (err) {
      applyServerError(err, setFieldErrors, setServerError);
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    const trimmedOtp = otp.trim();

    if (!required(trimmedOtp)) {
      errors.otp = 'Reset code is required.';
    } else if (trimmedOtp.length !== 6) {
      errors.otp = 'Enter the 6-digit code.';
    }

    if (!required(newPassword)) {
      errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters.';
    }

    if (!required(confirmPassword)) {
      errors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    setFieldErrors({});

    try {
      await authApi.resetPassword({
        email: email.trim(),
        otp: trimmedOtp,
        newPassword,
      });
      navigate('/auth/login', {
        replace: true,
        state: { message: 'Password reset successful. Please log in with your new password.' },
      });
    } catch (err) {
      applyServerError(err, setFieldErrors, setServerError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-gray-900">
          {step === 1 ? 'Forgot password' : 'Reset your password'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {step === 1
            ? 'Enter your registered email address to receive a password reset code.'
            : 'Enter the 6-digit code sent to your email along with your new password.'}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-4" noValidate>
            {serverError && <Alert variant="error">{serverError}</Alert>}

            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              error={fieldErrors.email}
              autoComplete="email"
              placeholder="you@example.com"
            />

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Sending code…' : 'Send Reset Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-4" noValidate>
            {infoMessage && <Alert variant="info">{infoMessage}</Alert>}
            {serverError && <Alert variant="error">{serverError}</Alert>}

            <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <span className="truncate">
                Code sent to <strong className="text-gray-900">{email}</strong>
              </span>
              <button
                type="button"
                aria-label="Change email address"
                onClick={() => {
                  setStep(1);
                  setFieldErrors({});
                  setServerError(null);
                  setInfoMessage(null);
                }}
                className="ml-2 font-medium text-blue-600 hover:text-blue-700"
              >
                Change email
              </button>
            </div>

            <Input
              id="otp"
              label="6-Digit Reset Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              error={fieldErrors.otp}
              placeholder="123456"
              autoComplete="one-time-code"
            />

            <PasswordInput
              id="newPassword"
              label="New Password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              error={fieldErrors.newPassword}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              hint="At least 6 characters"
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
              placeholder="Re-enter new password"
            />

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Didn't receive the code?</span>
              <button
                type="button"
                disabled={resending || submitting}
                onClick={handleResendOtp}
                className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {resending ? 'Resending…' : 'Resend code'}
              </button>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Resetting password…' : 'Reset Password'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Remember your password?{' '}
          <Link to="/auth/login" className="font-medium text-blue-600 hover:text-blue-700">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default ForgotPasswordPage;
