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
import type { SRCMemberRole } from '../../types';

const SRC_ROLE_OPTIONS: { value: SRCMemberRole; label: string }[] = [
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'co_supervisor', label: 'Co-supervisor' },
  { value: 'member', label: 'Member' },
];

interface MemberRow {
  id: string;
  faculty: string;
  role: SRCMemberRole;
}

const createRow = (): MemberRow => ({ id: crypto.randomUUID(), faculty: '', role: 'member' });

export function SrcCommitteeManagement(): JSX.Element {
  const { user } = useAuth();
  const studentsReq = useApi(() => adminApi.listStudents({ limit: 100 }), []);
  const facultyReq = useApi(() => adminApi.listFaculty({ limit: 100 }), []);

  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<MemberRow[]>(() => [createRow()]);
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

  const updateRow = (index: number, patch: Partial<MemberRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, createRow()]);

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!studentId) {
      setFormError('Select a student.');
      return;
    }
    if (rows.length === 0 || rows.some((row) => !row.faculty)) {
      setFormError('Every committee member must be assigned to a faculty member.');
      return;
    }
    const chairpersonCount = rows.filter((row) => row.role === 'chairperson').length;
    if (chairpersonCount !== 1) {
      setFormError('A committee must have exactly one chairperson.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await adminApi.createSRCCommittee({ studentId, members: rows });
      setSubmitting(false);
      setSuccessMessage('SRC committee created successfully.');
      setRows([createRow()]);
    } catch {
      setSubmitting(false);
      setFormError('Unable to create the committee. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="SRC Committee Management"
        description="Form the Student Research Committee for a scholar."
      />
      {successMessage && (
        <div className="mb-6">
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </div>
      )}
      <Card title="Create Committee">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {!loading && loadError && (
          <QueryError error={loadError} onRetry={retry} />
        )}
        {!loading && !loadError && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && <Alert variant="error">{formError}</Alert>}
            <p className="text-sm text-gray-500">
              Committees are created for students. If a committee already exists for the selected student, the
              request will be rejected.
            </p>
            <Select
              id="committee-student"
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
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Members</span>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={row.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Select
                      id={`committee-member-faculty-${index}`}
                      label="Faculty"
                      value={row.faculty}
                      onChange={(event) => updateRow(index, { faculty: event.target.value })}
                      options={[
                        { value: '', label: 'Select a faculty member' },
                        ...faculty.map((member) => ({
                          value: member._id,
                          label: `${member.user?.name ?? 'Unknown'} · ${member.designation}`,
                        })),
                      ]}
                    />
                    <Select
                      id={`committee-member-role-${index}`}
                      label="Role"
                      value={row.role}
                      onChange={(event) => updateRow(index, { role: event.target.value as SRCMemberRole })}
                      options={SRC_ROLE_OPTIONS}
                    />
                    <div className="flex items-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={addRow}>
                  Add member
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create committee'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}

export default SrcCommitteeManagement;