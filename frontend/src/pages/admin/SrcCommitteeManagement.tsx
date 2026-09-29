import { useState, useMemo } from 'react';
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
import type { SRCCommittee, SRCMemberRole } from '../../types';
import { formatFaculty } from '../../utils/constants';

const SRC_MEMBER_ROLE_OPTIONS: { value: 'member' | 'external_member'; label: string }[] = [
  { value: 'member', label: 'Member (CSE Internal)' },
  { value: 'external_member', label: 'External Member (Outside CSE)' },
];

interface MemberRow {
  id: string;
  faculty: string;
  role: 'member' | 'external_member';
}

const createInitialRows = (): MemberRow[] => [
  { id: crypto.randomUUID(), faculty: '', role: 'member' },
  { id: crypto.randomUUID(), faculty: '', role: 'external_member' },
];

const createRow = (role: 'member' | 'external_member' = 'member'): MemberRow => ({
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

  // Identify HOD from loaded faculty list
  const hodFaculty = faculty.find((f) => f.isHod);

  const selectedStudent = students.find((s) => s._id === studentId);
  const supervisorObj = selectedStudent?.supervisor;
  const coSupervisorObj = selectedStudent?.coSupervisor;

  const supervisorId = supervisorObj
    ? typeof supervisorObj === 'object'
      ? supervisorObj._id
      : supervisorObj
    : null;
  const coSupervisorId = coSupervisorObj
    ? typeof coSupervisorObj === 'object'
      ? coSupervisorObj._id
      : coSupervisorObj
    : null;
  const hasSupervisor = Boolean(supervisorId);

  // Exclude assigned supervisor, co-supervisor, and HOD (since HOD is already Chairperson)
  const assignedFacultyIds = useMemo(
    () => new Set([supervisorId, coSupervisorId, hodFaculty?._id].filter(Boolean)),
    [supervisorId, coSupervisorId, hodFaculty?._id]
  );
  const availableFaculty = useMemo(
    () => faculty.filter((member) => !assignedFacultyIds.has(member._id)),
    [faculty, assignedFacultyIds]
  );
  const cseFaculty = useMemo(
    () => availableFaculty.filter((f) => (f.department || '').trim().toUpperCase() === 'CSE'),
    [availableFaculty]
  );
  const nonCseFaculty = useMemo(
    () => availableFaculty.filter((f) => (f.department || '').trim().toUpperCase() !== 'CSE'),
    [availableFaculty]
  );

  const hasExistingCommittee = Boolean(selectedStudent?.srcCommittee);

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
    if (rows.length <= 2) return;
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
        'A supervisor must be assigned to the student before forming the SRC committee. Please assign a supervisor first.'
      );
      return;
    }

    if (!hodFaculty) {
      setFormError('No HOD found in system. Please designate a Faculty as HOD in Faculty Management before forming an SRC committee.');
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

    if (rows.length < 2) {
      setFormError('Per ordinance, an SRC committee must have at least 2 members in addition to Chairperson and Supervisor.');
      return;
    }

    // Verify departments
    for (const row of rows) {
      const fac = faculty.find((f) => f._id === row.faculty);
      const isCse = (fac?.department || '').trim().toUpperCase() === 'CSE';
      if (row.role === 'member' && !isCse) {
        setFormError(`Member "${fac?.user?.name || row.faculty}" must belong to CSE department.`);
        return;
      }
      if (row.role === 'external_member' && isCse) {
        setFormError(`External Member "${fac?.user?.name || row.faculty}" must belong to a department outside CSE.`);
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);

    // Bundle auto-assigned Chairperson (HOD), assigned Supervisor / Co-supervisor, and selected Members
    const membersPayload: { faculty: string; role: SRCMemberRole }[] = [
      { faculty: hodFaculty._id, role: 'chairperson' as SRCMemberRole },
      { faculty: supervisorId!, role: 'supervisor' as SRCMemberRole },
      ...(coSupervisorId ? [{ faculty: coSupervisorId, role: 'co_supervisor' as SRCMemberRole }] : []),
      ...rows.map((row) => ({ faculty: row.faculty, role: row.role as SRCMemberRole })),
    ];

    try {
      const existingCommitteeId = selectedStudent?.srcCommittee
        ? typeof selectedStudent.srcCommittee === 'object'
          ? (selectedStudent.srcCommittee as SRCCommittee)._id
          : selectedStudent.srcCommittee
        : null;

      if (existingCommitteeId) {
        await adminApi.updateSRCCommittee(existingCommitteeId, membersPayload);
        setSuccessMessage('SRC committee updated successfully.');
      } else {
        await adminApi.createSRCCommittee({ studentId, members: membersPayload });
        setSuccessMessage('SRC committee formed successfully.');
      }

      setSubmitting(false);
      setRows(createInitialRows());
      studentsReq.refetch();
    } catch (err: unknown) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      setFormError(message || 'Unable to save the committee. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="SRC Committee Management"
        description="Form and manage the Student Research Committee for a scholar."
      />
      {successMessage && (
        <div className="mb-6">
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </div>
      )}
      <Card title={hasExistingCommittee ? 'Update Committee' : 'Create Committee'}>
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {!loading && loadError && <QueryError error={loadError} onRetry={retry} />}
        {!loading && !loadError && (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {formError && <Alert variant="error">{formError}</Alert>}

            <p className="text-sm text-gray-500">
              Per PhD ordinance, the Head of Department (HOD) is automatically designated as the Chairperson.
              The scholar's assigned supervisor serves as an ex-officio member. The committee also requires at least
              two additional members: Internal CSE Members and External Members from departments outside CSE.
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
                  label: `${student.user?.name ?? 'Unknown'} · ${student.rollNumber} (${student.department})${
                    student.srcCommittee ? ' [SRC Formed]' : ''
                  }`,
                })),
              ]}
            />

            {studentId && hasExistingCommittee && (
              <Alert variant="info">
                This student already has an active SRC Committee. Submitting will update the committee members.
              </Alert>
            )}

            {studentId && !hasSupervisor && (
              <Alert variant="warning">
                <div className="space-y-1">
                  <p className="font-medium">Supervisor Not Assigned</p>
                  <p className="text-xs">
                    This scholar does not have an assigned supervisor yet. Per regulations, a supervisor must be assigned
                    first before forming the SRC committee.
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

            {/* Locked Chairperson Row */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-800 mb-1">
                Committee Chairperson (Locked)
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">
                  {hodFaculty
                    ? `Chairperson: ${hodFaculty.user?.name || hodFaculty.employeeId} (Auto-assigned HOD)`
                    : 'No HOD designated in the system'}
                </span>
                {hodFaculty && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    Auto-assigned HOD
                  </span>
                )}
              </div>
              {!hodFaculty ? (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  Per PhD ordinance, an HOD must be designated before forming an SRC committee. Please designate an HOD in Faculty Management.
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-600">
                  The HOD is permanently locked as the Chairperson for all SRC committees and cannot be changed by the administrator.
                </p>
              )}
            </div>

            {studentId && hasSupervisor && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-700">
                <div className="font-semibold text-gray-900 mb-2">Ex-officio Members (Auto-included):</div>
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
                <p className="mt-2 text-xs text-gray-500">
                  The assigned supervisor is automatically part of the SRC committee and cannot be selected as a regular or external member below.
                </p>
              </div>
            )}

            <fieldset disabled={!hasSupervisor || !hodFaculty}>
              <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Additional Committee Members (Minimum 2 Members)
              </legend>
              <div className="space-y-3">
                {rows.map((row, index) => {
                  const filteredFaculty = row.role === 'member' ? cseFaculty : nonCseFaculty;

                  return (
                    <div key={row.id} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
                      <Select
                        id={`committee-member-role-${index}`}
                        label="Member Role"
                        value={row.role}
                        onChange={(event) => {
                          const newRole = event.target.value as 'member' | 'external_member';
                          updateRow(index, { role: newRole, faculty: '' });
                        }}
                        options={SRC_MEMBER_ROLE_OPTIONS}
                      />
                      <Select
                        id={`committee-member-faculty-${index}`}
                        label={row.role === 'member' ? 'Faculty (CSE Internal)' : 'Faculty (Outside CSE)'}
                        value={row.faculty}
                        onChange={(event) => updateRow(index, { faculty: event.target.value })}
                        options={[
                          {
                            value: '',
                            label:
                              row.role === 'member'
                                ? 'Select CSE Internal faculty member'
                                : 'Select outside CSE faculty member',
                          },
                          ...filteredFaculty.map((member) => ({
                            value: member._id,
                            label: `${member.user?.name ?? 'Unknown'} · ${member.designation} (${member.department})`,
                          })),
                        ]}
                      />
                      <div className="flex items-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label="Remove committee member"
                          onClick={() => removeRow(index)}
                          disabled={rows.length <= 2}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={addRow} disabled={!hasSupervisor || !hodFaculty}>
                  + Add another member
                </Button>
              </div>
            </fieldset>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting || !hasSupervisor || !hodFaculty}>
                {submitting
                  ? 'Saving…'
                  : hasExistingCommittee
                    ? 'Update committee'
                    : 'Create committee'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}

export default SrcCommitteeManagement;
