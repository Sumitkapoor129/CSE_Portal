import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { DetailRow } from '../../components/shared/DetailRow';
import { Alert } from '../../components/ui/Alert';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { STUDENT_TYPE_LABELS, SRC_ROLE_LABELS, formatFaculty } from '../../utils/constants';
import { formatDate } from '../../utils/formatDate';

export function StudentProfile(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(studentApi.getProfile);

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const openEdit = () => {
    if (!data) return;
    setName(data.user.name);
    setResearchArea(data.researchArea ?? '');
    setProfilePhoto(data.profilePhoto ?? '');
    setFormError(null);
    setEditOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await studentApi.updateProfile({
        name: name.trim(),
        researchArea: researchArea.trim(),
        profilePhoto: profilePhoto.trim(),
      });
      setEditOpen(false);
      setSubmitting(false);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to save your profile. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your academic profile and committee details."
        actions={data ? <Button onClick={openEdit} variant="secondary">Edit profile</Button> : undefined}
      />
      {loading && <SkeletonCards count={3} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="space-y-6">
          <Card>
            <div className="mb-6 flex items-center gap-4">
              <Avatar name={data.user.name} photo={data.profilePhoto ?? null} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-gray-900">{data.user.name}</h2>
                <p className="truncate text-sm text-gray-500">{data.user.email}</p>
              </div>
            </div>
            <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Name" value={data.user.name} />
              <DetailRow label="Email" value={data.user.email} />
              <DetailRow label="College ID" value={data.collegeId} />
              <DetailRow label="Roll Number" value={data.rollNumber} />
              <DetailRow label="Student Type" value={STUDENT_TYPE_LABELS[data.studentType]} />
              <DetailRow label="Department" value={data.department} />
              <DetailRow label="Research Area" value={data.researchArea || '—'} />
              <DetailRow label="Admission Date" value={formatDate(data.admissionDate)} />
              <DetailRow label="Last Degree" value={data.lastDegree || '—'} />
              <DetailRow label="Required Credits" value={data.requiredCredits} />
              <DetailRow label="Supervisor" value={formatFaculty(data.supervisor)} />
              <DetailRow label="Co-supervisor" value={formatFaculty(data.coSupervisor)} />
            </dl>
          </Card>

          {data.srcCommittee && data.srcCommittee.members.length > 0 && (
            <Card title="SRC Committee" padded={false}>
              <ul className="divide-y divide-gray-100">
                {data.srcCommittee.members.map((member, index) => (
                  <li key={index} className="flex items-center justify-between gap-4 px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{formatFaculty(member.faculty)}</p>
                    <Badge label={SRC_ROLE_LABELS[member.role]} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            id="edit-name"
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            id="edit-research"
            label="Research Area"
            value={researchArea}
            onChange={(event) => setResearchArea(event.target.value)}
          />
          <Input
            id="edit-photo"
            label="Profile Photo URL"
            value={profilePhoto}
            onChange={(event) => setProfilePhoto(event.target.value)}
            placeholder="https://example.com/photo.jpg"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default StudentProfile;