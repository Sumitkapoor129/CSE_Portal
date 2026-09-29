import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate, Link } from 'react-router-dom';
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
import { formatFaculty } from '../../utils/constants';

const SRC_ROLE_OPTIONS: { value: SRCMemberRole; label: string }[] = [
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'member', label: 'Member' },
];

interface MemberRow {
  id: string;
  faculty: string;
  role: SRCMemberRole;
}

const createInitialRows = (): MemberRow[] => [
  { id: crypto.randomUUID(), faculty: '', role: 'chairperson' },
  { id: crypto.randomUUID(), faculty: '', role: 'member' },
  { id: crypto.randomUUID(), faculty: '', role: 'member' },
];

const createRow = (role: SRCMemberRole = 'member'): MemberRow => ({
  id: crypto.randomUUID(),
  faculty: '',
  role,
});

export function SrcCommitteeManagement(): JSX.Element {
  const { user } = useAuth();
  const studentsReq = useApi((opts) => adminApi.listStudents({ limit: 100 }, opts), []);
  const facultyReq = useApi((opts) => adminApi.listFaculty({ limit: 100 }, opts), []);

  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<MemberRow[]>(createInitialRows);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const loading = studentsReq.loading || facultyReq.loading;
  const loadError = studentsReq.error ?? facultyReq.error;
  const students = studentsReq.data?.students ?? [];
  const faculty = facultyReq.data?.faculty ?? [];

  const selectedStudent = students.find((s) => s._id === studentId);
  const supervisorObj = selectedStudent?.supervisor;
  const coSupervisorObj = selectedStudent?.coSupervisor;

  const supervisorId = supervisorObj
    ? (typeof supervisorObj === 'object' ? supervisorObj._id : supervisorObj)
    : null;
  const coSupervisorId = coSupervisorObj
    ? (typeof coSupervisorObj === 'object' ? coSupervisorObj._id : coSupervisorObj)
    : null;
  const hasSupervisor = Boolean(supervisorId);

  // Exclude assigned supervisor & co-supervisor from selectable faculty list
  const assignedFacultyIds = new Set([supervisorId, coSupervisorId].filter(Boolean));
  const availableFaculty = faculty.filter((member) => !assignedFacultyIds.has(member._id));

  const retry = () => {
    studentsReq.refetch();
    facultyReq.refetch();
  };

  const handleStudentChange = (newStudentId: string) => {
    setStudentId(newStudentId);
    setFormError(null);
    setSuccessMessage(null);
  };

  const updateRow = (index: number, patch: Partial<MemberRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, createRow('member')]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (!studentId) {
      setFormError('Please select a student.');
      return;
    }

    if (!hasSupervisor) {
      setFormError(
        'A supervisor must be assigned to the student before creating the SRC committee. Please assign a supervisor first.'
      );
      return;
    }

    if (rows.length === 0 || rows.some((row) => !row.faculty)) {
      setFormError('Every committee member row must have a faculty member selected.');
      return;
    }

    const selectedFacultyIds = rows.map((row) => row.faculty);
    if (new Set(selectedFacultyIds).size !== selectedFacultyIds.length) {
      setFormError('Each faculty member can only be selected once in the committee.');
      return;
    }

    const chairpersonCount = rows.filter((row) => row.role === 'chairperson').length;
    if (chairpersonCount !== 1) {
      setFormError('An SRC committee must have exactly one chairperson.');
      return;
    }

    const regularMemberCount = rows.filter((row) => row.role === 'member').length;
    if (regularMemberCount < 2) {
      setFormError('Per ordinance, an SRC committee must have at least 2 regular members (in addition to Chairperson and Supervisor).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    // Bundle assigned supervisor (and co-supervisor) along with the selected chairperson and members
    const membersPayload: { faculty: string; role: SRCMemberRole }[] = [
      { faculty: supervisorId!, role: 'supervisor' },
      ...(coSupervisorId ? [{ faculty: coSupervisorId, role: 'co_supervisor' as SRCMemberRole }] : []),
      ...rows.map((row) => ({ faculty: row.faculty, role: row.role })),
    ];

    try {
      await adminApi.createSRCCommittee({ studentId, members: membersPayload });
      setSubmitting(false);
      setSuccessMessage('SRC committee created successfully.');
      setRows(createInitialRows());
      studentsReq.refetch();
    } catch (err: unknown) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      setFormError(message || 'Unable to create the committee. Please try again.');
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
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {formError && <Alert variant="error">{formError}</Alert>}

            <p className="text-sm text-gray-500">
              Per PhD ordinance, each scholar requires an assigned supervisor first. The supervisor serves as an ex-officio member of the SRC. The committee also requires exactly one Chairperson and at least two regular Members.
            </p>

            <Select
              id="committee-student"
              label="Student"
              value={studentId}
              onChange={(event) => handleStudentChange(event.target.value)}
              options={[
                { value: '', label: 'Select a student' },
                ...students.map((student) => ({
                  value: student._id,
                  label: `${student.user?.name ?? 'Unknown'} · ${student.rollNumber} (${student.department})`,
                })),
              ]}
            />

            {studentId && !hasSupervisor && (
              <Alert variant="warning">
                <div className="space-y-1">
                  <p className="font-medium">Supervisor Not Assigned</p>
                  <p className="text-xs">
                    This scholar does not have an assigned supervisor yet. Per regulations, a supervisor must be assigned first before forming the SRC committee.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/admin/assignments"
                      className="inline-flex items-center text-xs font-semibold text-amber-900 underline hover:text-amber-800"
                    >
                      Go to Supervisor Assignment &rarr;
                    </Link>
                  </div>
                </div>
              </Alert>
            )}

            {studentId && hasSupervisor && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm text-gray-700">
                <div className="font-semibold text-gray-900 mb-2">Ex-officio Committee Members (Auto-included):</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{formatFaculty(supervisorObj)}</span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      Supervisor
                    </span>
                  </div>
                  {coSupervisorObj && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{formatFaculty(coSupervisorObj)}</span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Co-supervisor
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-2.5 text-xs text-gray-500">
                  The assigned supervisor is automatically part of the SRC committee and cannot be chosen for Chairperson or regular Member roles below.
                </p>
              </div>
            )}

            <fieldset disabled={!hasSupervisor}>
              <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Additional Committee Members (1 Chairperson + At least 2 Members)
              </legend>
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
                        ...availableFaculty.map((member) => ({
                          value: member._id,
                          label: `${member.user?.name ?? 'Unknown'} · ${member.designation} (${member.department})`,
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
                        aria-label="Remove committee member"
                        onClick={() => removeRow(index)}
                        disabled={rows.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={addRow} disabled={!hasSupervisor}>
                  + Add another member
                </Button>
              </div>
            </fieldset>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting || !hasSupervisor}>
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
