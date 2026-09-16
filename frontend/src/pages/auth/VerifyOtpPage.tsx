import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { applyServerError } from '../../utils/errors';
import { required } from '../../utils/validators';

interface FieldErrors {
  email?: string;
  otp?: string;
}

export function VerifyOtpPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    if (!required(email)) errors.email = 'Email is required.';
    if (!required(otp)) errors.otp = 'OTP is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    setSuccessNote(null);
    try {
      await authApi.verifyOtp(email, otp);
      setSuccessNote('Account activated. Please log in.');
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
      applyServerError(err, setFieldErrors, setServerError);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-gray-900">Verify your email</h1>
        <p className="mt-1 text-sm text-gray-500">Enter the one-time password sent to your email.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {serverError && <Alert variant="error">{serverError}</Alert>}
          {successNote && <Alert variant="success">{successNote}</Alert>}

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

          <Input
            id="otp"
            label="OTP"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={handleOtpChange}
            error={fieldErrors.otp}
            placeholder="6-digit code"
            autoComplete="one-time-code"
          />

          {successNote ? (
            <Button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="w-full"
            >
              Go to login
            </Button>
          ) : (
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Verifying…' : 'Verify'}
            </Button>
          )}
        </form>
      </div>
    </main>
  );
}

export default VerifyOtpPage;
