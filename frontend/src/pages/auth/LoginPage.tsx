import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { applyServerError } from '../../utils/errors';

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage(): JSX.Element {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
    if (serverError) setServerError(null);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
    if (serverError) setServerError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    if (!email) errors.email = 'Email is required.';
    if (!password) errors.password = 'Password is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setSubmitting(false);
      applyServerError(err, setFieldErrors, setServerError);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-gray-900">Log in</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to your PhD Scholar Portal account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
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

          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={handlePasswordChange}
            error={fieldErrors.password}
            autoComplete="current-password"
          />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          New student?{' '}
          <Link to="/auth/register" className="font-medium text-blue-600 hover:text-blue-700">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}

export default LoginPage;
