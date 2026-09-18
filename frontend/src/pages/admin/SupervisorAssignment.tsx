import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';

export function SupervisorAssignment(): JSX.Element {
  const { user } = useAuth();
  const studentsReq = useApi((opts) => adminApi.listStudents({ limit: 100 }, opts), []);
  const facultyReq = useApi((opts) => adminApi.listFaculty({ limit: 100 }, opts), []);

  const [studentId, setStudentId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [coSupervisorId, setCoSupervisorId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const loading = studentsReq.loading || facultyReq.loading;
  const loadError = studentsReq.error ?? facultyReq.error;
  const students = studentsReq.data?.students ?? [];
  const faculty = facultyReq.data?.faculty ?? [];

  const retry = () => {
    studentsReq.refetch();
    facultyReq.refetch();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!studentId || !supervisorId) {
      setFormError('Select both a student and a supervisor.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await adminApi.assignSupervisor({
        studentId,
        supervisorId,
        coSupervisorId: coSupervisorId || undefined,
      });
      setSubmitting(false);
      setSuccessMessage('Supervisor assigned successfully.');
      setStudentId('');
      setSupervisorId('');
      setCoSupervisorId('');
    } catch {
      setSubmitting(false);
      setFormError('Unable to assign the supervisor. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Supervisor Assignment"
        description="Assign or reassign a supervisor and co-supervisor to a scholar."
      />
      {successMessage && (
        <div className="mb-6">
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </div>
      )}
      <Card title="Assign Supervisor">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {!loading && loadError && <QueryError error={loadError} onRetry={retry} />}
        {!loading && !loadError && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && <Alert variant="error">{formError}</Alert>}
            <p className="text-sm text-gray-500">
              Assigning a supervisor replaces any existing active assignment for the selected student.
            </p>
            <Select
              id="assign-student"
              label="Student"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              options={[
                { value: '', label: 'Select a student' },
                ...students.map((student) => ({
                  value: student._id,
                  label: `${student.user?.name ?? 'Unknown'} · ${student.rollNumber} (${student.department})`,
                })),
              ]}
            />
            <Select
              id="assign-supervisor"
              label="Supervisor"
              value={supervisorId}
              onChange={(event) => setSupervisorId(event.target.value)}
              options={[
                { value: '', label: 'Select a supervisor' },
                ...faculty.map((member) => ({
                  value: member._id,
                  label: `${member.user?.name ?? 'Unknown'} · ${member.designation} (${member.department})`,
                })),
              ]}
            />
            <Select
              id="assign-co-supervisor"
              label="Co-Supervisor"
              value={coSupervisorId}
              onChange={(event) => setCoSupervisorId(event.target.value)}
              options={[
                { value: '', label: 'Optional' },
                ...faculty.map((member) => ({
                  value: member._id,
                  label: `${member.user?.name ?? 'Unknown'} · ${member.designation} (${member.department})`,
                })),
              ]}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Assigning…' : 'Assign supervisor'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}

export default SupervisorAssignment;