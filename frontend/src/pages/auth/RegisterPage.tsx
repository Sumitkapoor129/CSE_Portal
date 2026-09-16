import { useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Select } from '../../components/ui/Select';
import { STUDENT_TYPE_OPTIONS } from '../../utils/constants';
import { applyServerError } from '../../utils/errors';
import { required, validateEmail } from '../../utils/validators';
import type { RegisterPayload } from '../../api/auth';
import { authApi } from '../../api/auth';

interface FormState {
  name: string;
  email: string;
  password: string;
  collegeId: string;
  rollNumber: string;
  studentType: 'frp' | 'erp';
  department: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  collegeId?: string;
  rollNumber?: string;
  studentType?: string;
  department?: string;
}

const emptyForm: FormState = {
  name: '',
  email: '',
  password: '',
  collegeId: '',
  rollNumber: '',
  studentType: 'frp',
  department: '',
};

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFieldChange = (field: keyof FormState) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (serverError) setServerError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    if (!required(form.name)) errors.name = 'Name is required.';
    if (!required(form.email)) errors.email = 'Email is required.';
    else if (!validateEmail(form.email)) errors.email = 'Enter a valid email address.';
    if (!required(form.password)) errors.password = 'Password is required.';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!required(form.collegeId)) errors.collegeId = 'College ID is required.';
    if (!required(form.rollNumber)) errors.rollNumber = 'Roll number is required.';
    if (!required(form.studentType)) errors.studentType = 'Student type is required.';
    if (!required(form.department)) errors.department = 'Department is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    setSuccessNote(null);

    const payload: RegisterPayload = {
      name: form.name,
      email: form.email,
      password: form.password,
      collegeId: form.collegeId,
      rollNumber: form.rollNumber,
      studentType: form.studentType,
      department: form.department,
    };

    try {
      await authApi.register(payload);
      setSuccessNote('Verification OTP sent to your email.');
      navigate('/auth/verify-otp', { state: { email: form.email } });
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
      applyServerError(err, setFieldErrors, setServerError);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-gray-900">Create an account</h1>
        <p className="mt-1 text-sm text-gray-500">Register as a new PhD scholar.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {serverError && <Alert variant="error">{serverError}</Alert>}
          {successNote && <Alert variant="success">{successNote}</Alert>}

          <Input
            id="name"
            label="Full Name"
            type="text"
            value={form.name}
            onChange={handleFieldChange('name')}
            error={fieldErrors.name}
            autoComplete="name"
          />

          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={handleFieldChange('email')}
            error={fieldErrors.email}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <PasswordInput
            id="password"
            label="Password"
            value={form.password}
            onChange={handleFieldChange('password')}
            error={fieldErrors.password}
            hint="At least 8 characters."
            autoComplete="new-password"
          />

          <Input
            id="collegeId"
            label="College ID"
            type="text"
            value={form.collegeId}
            onChange={handleFieldChange('collegeId')}
            error={fieldErrors.collegeId}
          />

          <Input
            id="rollNumber"
            label="Roll Number"
            type="text"
            value={form.rollNumber}
            onChange={handleFieldChange('rollNumber')}
            error={fieldErrors.rollNumber}
          />

          <Select
            id="studentType"
            label="Student Type"
            value={form.studentType}
            onChange={handleFieldChange('studentType')}
            error={fieldErrors.studentType}
            options={STUDENT_TYPE_OPTIONS}
          />

          <Input
            id="department"
            label="Department"
            type="text"
            value={form.department}
            onChange={handleFieldChange('department')}
            error={fieldErrors.department}
          />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Registering…' : 'Register'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already registered?{' '}
          <Link to="/auth/login" className="font-medium text-blue-600 hover:text-blue-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
