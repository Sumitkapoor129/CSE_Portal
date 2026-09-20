import { useRef, useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const STEPS = ['Personal', 'Academics', 'Contact'] as const;

export interface OnboardingForm {
  profilePhoto: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  category: string;
  lastDegree: string;
  institution: string;
  graduationYear: string;
  qualification: string;
  researchArea: string;
  phone: string;
  address: string;
}

const emptyForm: OnboardingForm = {
  profilePhoto: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  category: '',
  lastDegree: '',
  institution: '',
  graduationYear: '',
  qualification: '',
  researchArea: '',
  phone: '',
  address: '',
};

const GENDER_OPTIONS = [{ value: '', label: 'Select gender' }, { value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }, { value: 'Other', label: 'Other' }];
const BLOOD_GROUP_OPTIONS = [{ value: '', label: 'Select blood group' }, { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }];
const CATEGORY_OPTIONS = [{ value: '', label: 'Select category' }, { value: 'General', label: 'General' }, { value: 'OBC', label: 'OBC' }, { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' }, { value: 'EWS', label: 'EWS' }];
const LAST_DEGREE_OPTIONS = [
  { value: '', label: 'Select qualifying last degree' },
  { value: 'B.Tech', label: 'B.Tech (Direct PhD Admission — 20 Credits)' },
  { value: 'M.Tech', label: 'M.Tech (Post-Master Admission — 12 Credits)' },
];

export function StudentOnboarding(): JSX.Element {
  const navigate = useNavigate();
  const { reload } = useAuth();

  const [step, setStep] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof OnboardingForm) => (event: { target: { value: string } }) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    if (serverError) setServerError(null);
  };

  const stepValid = (): boolean => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!form.dateOfBirth) next.dateOfBirth = 'Date of birth is required.';
      if (!form.gender) next.gender = 'Gender is required.';
      if (!form.bloodGroup) next.bloodGroup = 'Blood group is required.';
      if (!form.category) next.category = 'Category is required.';
    } else if (step === 1) {
      if (!form.lastDegree) next.lastDegree = 'Last degree is required.';
      if (!form.institution) next.institution = 'Institution is required.';
      const year = Number(form.graduationYear);
      if (!form.graduationYear) next.graduationYear = 'Graduation year is required.';
      else if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear()) {
        next.graduationYear = 'Enter a valid graduation year.';
      }
    } else {
      if (!form.phone || !form.phone.trim()) next.phone = 'Mobile number is required.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (stepValid()) {
      setErrors({});
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      stepHeadingRef.current?.focus();
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step === 0) {
      navigate('/student');
      return;
    }
    setStep((prev) => prev - 1);
    stepHeadingRef.current?.focus();
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && step < STEPS.length - 1) {
      event.preventDefault();
      handleNext();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !stepValid()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const assignedCredits = form.lastDegree === 'B.Tech' ? 20 : 12;
      await studentApi.updateProfile({
        profilePhoto: form.profilePhoto.trim() || undefined,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        category: form.category,
        lastDegree: form.lastDegree,
        requiredCredits: assignedCredits,
        institution: form.institution,
        graduationYear: Number(form.graduationYear),
        qualification: form.qualification.trim() || undefined,
        researchArea: form.researchArea.trim() || undefined,
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
      });
      await reload();
      navigate('/student/profile', { replace: true });
    } catch (err) {
      setSubmitting(false);
      setServerError(err instanceof Error ? err.message : 'Unable to save your profile. Please try again.');
    }
  };

  const stepFields: Record<number, { label: string; id: string; field: keyof OnboardingForm; placeholder?: string; type?: string; autoComplete?: string }[]> = {
    0: [
      { label: 'Date of Birth', id: 'ob-dob', field: 'dateOfBirth', placeholder: '2000-01-15' },
      { label: 'Profile Photo URL', id: 'ob-photo', field: 'profilePhoto', placeholder: 'https://example.com/photo.jpg' },
    ],
    1: [
      { label: 'Institution', id: 'ob-institution', field: 'institution', placeholder: 'e.g. NIT Jamshedpur' },
      { label: 'Graduation Year', id: 'ob-year', field: 'graduationYear', placeholder: 'e.g. 2022' },
      { label: 'Qualification / Score', id: 'ob-qual', field: 'qualification', placeholder: 'e.g. CGPA 9.2' },
      { label: 'Research Area', id: 'ob-research', field: 'researchArea', placeholder: 'e.g. Machine Learning' },
    ],
    2: [
      { label: 'Phone', id: 'ob-phone', field: 'phone', placeholder: 'e.g. 98765 43210', type: 'tel', autoComplete: 'tel' },
      { label: 'Address', id: 'ob-address', field: 'address', placeholder: 'City, State' },
    ],
  };

  return (
    <>
      <PageHeader
        title="Complete your profile"
        description="Tell us a bit more so your department record is complete."
      />

      <Card>
        <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Progress">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2" aria-current={index === step ? 'step' : undefined}>
              <span
                className={
                  index === step
                    ? 'rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white'
                    : 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600'
                }
              >
                {index + 1}
              </span>
              <span className={index === step ? 'font-medium text-gray-900' : 'text-gray-500'}>{label}</span>
              {index < STEPS.length - 1 && <span className="text-gray-300">·</span>}
            </li>
          ))}
        </ol>

        <h2
          ref={stepHeadingRef}
          tabIndex={-1}
          className="mb-4 rounded text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STEPS[step]}
        </h2>

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4" noValidate>
          {serverError && <Alert variant="error">{serverError}</Alert>}

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="ob-dob" label="Date of Birth" type="date" autoComplete="bday" value={form.dateOfBirth} onChange={setField('dateOfBirth')} error={errors.dateOfBirth} />
              <Input id="ob-photo" label="Profile Photo URL" type="url" value={form.profilePhoto} onChange={setField('profilePhoto')} error={errors.profilePhoto} placeholder="https://example.com/photo.jpg" />
              <Select id="ob-gender" label="Gender" value={form.gender} onChange={setField('gender')} error={errors.gender} options={GENDER_OPTIONS} />
              <Select id="ob-blood" label="Blood Group" value={form.bloodGroup} onChange={setField('bloodGroup')} error={errors.bloodGroup} options={BLOOD_GROUP_OPTIONS} />
              <Select id="ob-category" label="Category" value={form.category} onChange={setField('category')} error={errors.category} options={CATEGORY_OPTIONS} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    id="ob-degree"
                    label="Last Degree (Qualifying Degree)"
                    value={form.lastDegree}
                    onChange={setField('lastDegree')}
                    error={errors.lastDegree}
                    options={LAST_DEGREE_OPTIONS}
                  />
                  {form.lastDegree && (
                    <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                      <p className="font-semibold">
                        {form.lastDegree === 'B.Tech'
                          ? '🎓 B.Tech Candidate: 20 Coursework Credits Assigned'
                          : '🎓 M.Tech Candidate: 12 Coursework Credits Assigned'}
                      </p>
                      <p className="mt-0.5 text-blue-700">
                        {form.lastDegree === 'B.Tech'
                          ? 'Per NIT Jamshedpur PhD Regulations, direct admission candidates with a B.Tech require 20 credits.'
                          : 'Per NIT Jamshedpur PhD Regulations, candidates admitted with a Master’s degree (M.Tech) require 12 credits.'}
                      </p>
                    </div>
                  )}
                </div>
                {stepFields[1].map(({ label, id, field, placeholder, type, autoComplete }) => (
                  <Input key={id} id={id} label={label} type={type} autoComplete={autoComplete} value={String(form[field])} onChange={setField(field)} error={errors[field]} placeholder={placeholder} />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {stepFields[2].map(({ label, id, field, placeholder, type, autoComplete }) => (
                <Input key={id} id={id} label={label} type={type} autoComplete={autoComplete} value={String(form[field])} onChange={setField(field)} error={errors[field]} placeholder={placeholder} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="secondary" onClick={handleBack} disabled={submitting}>
              {step === 0 ? 'Skip for now' : 'Back'}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save profile'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </>
  );
}

export default StudentOnboarding;