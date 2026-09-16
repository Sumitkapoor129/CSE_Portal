import { useEffect, useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { QueryError } from '../../components/shared/QueryError';
import { ACTIVE_STATUS_STYLE, INACTIVE_STATUS_STYLE, STUDENT_TYPE_LABELS, STUDENT_TYPE_OPTIONS } from '../../utils/constants';
import type { StudentProfileView, StudentType } from '../../types';

const EMPTY_CREATE_FORM = {
  email: '',
  password: '',
  name: '',
  collegeId: '',
  rollNumber: '',
  studentType: 'frp' as StudentType,
  department: '',
  researchArea: '',
  admissionDate: '',
  requiredCredits: '',
};

const EMPTY_EDIT_FORM = {
  name: '',
  email: '',
  collegeId: '',
  rollNumber: '',
  studentType: 'frp' as StudentType,
  department: '',
  researchArea: '',
  profilePhoto: '',
};

export function StudentManagement(): JSX.Element {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [appliedName, setAppliedName] = useState('');
  const [studentType, setStudentType] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(() => searchParams.get('create') === '1');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<StudentProfileView | null>(null);
  const [editingForm, setEditingForm] = useState(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmStudent, setConfirmStudent] = useState<StudentProfileView | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedName(name);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  const { data, loading, error, refetch } = useApi(
    () =>
      adminApi.listStudents({
        search: appliedName || undefined,
        studentType: studentType || undefined,
        department: department || undefined,
        page,
        limit: 10,
      }),
    [appliedName, studentType, department, page]
  );

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const students = data?.students ?? [];
  const pagination = data?.pagination;

  const hasFilters = Boolean(name || studentType || department);

  const clearFilters = () => {
    setName('');
    setAppliedName('');
    setStudentType('');
    setDepartment('');
    setPage(1);
  };

  const activeStyle = ACTIVE_STATUS_STYLE;
  const inactiveStyle = INACTIVE_STATUS_STYLE;

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreating(false);
    setCreateError(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;
    if (
      !createForm.email.trim() ||
      !createForm.password ||
      !createForm.name.trim() ||
      !createForm.collegeId.trim() ||
      !createForm.rollNumber.trim() ||
      !createForm.department.trim()
    ) {
      setCreateError('Email, password, name, college ID, roll number, and department are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await adminApi.createStudent({
        email: createForm.email.trim(),
        password: createForm.password,
        name: createForm.name.trim(),
        collegeId: createForm.collegeId.trim(),
        rollNumber: createForm.rollNumber.trim(),
        studentType: createForm.studentType,
        department: createForm.department.trim(),
        researchArea: createForm.researchArea.trim() || undefined,
        admissionDate: createForm.admissionDate || undefined,
        requiredCredits: createForm.requiredCredits !== '' ? Number(createForm.requiredCredits) : undefined,
      });
      closeCreate();
      setSuccessMessage('Student created successfully.');
      setPage(1);
      refetch();
    } catch {
      setCreating(false);
      setCreateError('Unable to create the student. Please try again.');
    }
  };

  const openEdit = (student: StudentProfileView) => {
    setEditing(student);
    setEditingForm({
      name: student.user?.name ?? '',
      email: student.user?.email ?? '',
      collegeId: student.collegeId,
      rollNumber: student.rollNumber,
      studentType: student.studentType,
      department: student.department,
      researchArea: student.researchArea ?? '',
      profilePhoto: student.profilePhoto ?? '',
    });
    setEditError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setSavingEdit(false);
    setEditError(null);
  };

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || savingEdit) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await adminApi.updateStudent(editing._id, {
        name: editingForm.name.trim() || undefined,
        email: editingForm.email.trim() || undefined,
        collegeId: editingForm.collegeId.trim() || undefined,
        rollNumber: editingForm.rollNumber.trim() || undefined,
        studentType: editingForm.studentType,
        department: editingForm.department.trim() || undefined,
        researchArea: editingForm.researchArea.trim() || undefined,
        profilePhoto: editingForm.profilePhoto.trim() || undefined,
      });
      closeEdit();
      setSuccessMessage('Student updated successfully.');
      refetch();
    } catch {
      setSavingEdit(false);
      setEditError('Unable to update the student. Please try again.');
    }
  };

  const handleToggle = async () => {
    if (!confirmStudent || toggling) return;
    setToggling(true);
    setToggleError(null);
    try {
      await adminApi.toggleStudentActive(confirmStudent.user?._id ?? '');
      setSuccessMessage(
        confirmStudent.user?.isActive ? 'Student account deactivated.' : 'Student account activated.'
      );
      setConfirmStudent(null);
      setToggling(false);
      refetch();
    } catch {
      setToggling(false);
      setToggleError('Unable to update account status. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Student Management"
        description="Create, edit, and manage scholar accounts."
        actions={<Button onClick={openCreate}>Add Student</Button>}
      />
      {successMessage && (
        <div className="mb-6">
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </div>
      )}
      {!loading && error && (
        <div className="mb-6">
          <QueryError error={error} onRetry={refetch} />
        </div>
      )}
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            id="filter-name"
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Search by name or college ID"
          />
          <Select
            id="filter-type"
            label="Student Type"
            value={studentType}
            onChange={(event) => {
              setStudentType(event.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All types' },
              ...STUDENT_TYPE_OPTIONS,
            ]}
          />
          <Input
            id="filter-department"
            label="Department"
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. CSE"
          />
        </div>
        {hasFilters && (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {loading && <SkeletonTable rows={5} columns={5} />}

      {!loading && !error && (
        <Card title="Students" padded={false}>
          <Table
            columns={[
              { key: 'photo', header: 'Photo' },
              { key: 'name', header: 'Name' },
              { key: 'rollNumber', header: 'Roll Number' },
              { key: 'collegeId', header: 'College ID' },
              { key: 'studentType', header: 'Type' },
              { key: 'status', header: 'Status' },
              { key: 'actions', header: 'Actions' },
            ]}
          >
            {students.length === 0 ? (
              <TableEmpty colSpan={7} message="No students found." />
            ) : (
              students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell>
                    <Avatar name={student.user?.name ?? '—'} photo={student.profilePhoto ?? null} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{student.user?.name ?? '—'}</TableCell>
                  <TableCell className="text-gray-700">{student.rollNumber}</TableCell>
                  <TableCell className="text-gray-700">{student.collegeId}</TableCell>
                  <TableCell>
                    <Badge label={STUDENT_TYPE_LABELS[student.studentType]} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={student.user?.isActive ? 'Active' : 'Inactive'}
                      className={student.user?.isActive === false ? inactiveStyle : activeStyle}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(student)}>
                        Edit
                      </Button>
                      <Button
                        variant={student.user?.isActive === false ? 'primary' : 'danger'}
                        size="sm"
                        aria-label={student.user?.isActive === false ? `Activate ${student.user?.name || 'student'}` : `Deactivate ${student.user?.name || 'student'}`}
                        onClick={() => {
                          setToggleError(null);
                          setConfirmStudent(student);
                        }}
                      >
                        {student.user?.isActive === false ? 'Activate' : 'Deactivate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4">
              <Pagination page={page} totalPages={pagination.totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      <Modal open={createOpen} onClose={closeCreate} title="Add Student">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          {createError && <Alert variant="error">{createError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="create-email"
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
              placeholder="student@nitjsr.ac.in"
            />
            <PasswordInput
              id="create-password"
              label="Password"
              value={createForm.password}
              onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
              placeholder="Temporary password"
              autoComplete="new-password"
            />
            <Input
              id="create-name"
              label="Full Name"
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
              placeholder="Scholar name"
            />
            <Input
              id="create-college-id"
              label="College ID"
              value={createForm.collegeId}
              onChange={(event) => setCreateForm({ ...createForm, collegeId: event.target.value })}
              placeholder="e.g. 2024PHD001"
            />
            <Input
              id="create-roll"
              label="Roll Number"
              value={createForm.rollNumber}
              onChange={(event) => setCreateForm({ ...createForm, rollNumber: event.target.value })}
              placeholder="e.g. 22CSP001"
            />
            <Select
              id="create-type"
              label="Student Type"
              value={createForm.studentType}
              onChange={(event) => setCreateForm({ ...createForm, studentType: event.target.value as StudentType })}
              options={STUDENT_TYPE_OPTIONS}
            />
            <Input
              id="create-department"
              label="Department"
              value={createForm.department}
              onChange={(event) => setCreateForm({ ...createForm, department: event.target.value })}
              placeholder="e.g. CSE"
            />
            <Input
              id="create-research-area"
              label="Research Area"
              value={createForm.researchArea}
              onChange={(event) => setCreateForm({ ...createForm, researchArea: event.target.value })}
              placeholder="Optional"
            />
            <Input
              id="create-admission-date"
              label="Admission Date"
              type="date"
              value={createForm.admissionDate}
              onChange={(event) => setCreateForm({ ...createForm, admissionDate: event.target.value })}
            />
            <Input
              id="create-required-credits"
              label="Required Credits"
              type="number"
              min={0}
              value={createForm.requiredCredits}
              onChange={(event) => setCreateForm({ ...createForm, requiredCredits: event.target.value })}
              hint="20 for direct-admission PhD; defaults to 12"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeCreate}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create student'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={closeEdit} title="Edit Student">
        <form onSubmit={handleEdit} className="space-y-4" noValidate>
          {editError && <Alert variant="error">{editError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="edit-name"
              label="Full Name"
              value={editingForm.name}
              onChange={(event) => setEditingForm({ ...editingForm, name: event.target.value })}
            />
            <Input
              id="edit-email"
              label="Email"
              type="email"
              value={editingForm.email}
              onChange={(event) => setEditingForm({ ...editingForm, email: event.target.value })}
            />
            <Input
              id="edit-college-id"
              label="College ID"
              value={editingForm.collegeId}
              onChange={(event) => setEditingForm({ ...editingForm, collegeId: event.target.value })}
            />
            <Input
              id="edit-roll"
              label="Roll Number"
              value={editingForm.rollNumber}
              onChange={(event) => setEditingForm({ ...editingForm, rollNumber: event.target.value })}
            />
            <Select
              id="edit-type"
              label="Student Type"
              value={editingForm.studentType}
              onChange={(event) => setEditingForm({ ...editingForm, studentType: event.target.value as StudentType })}
              options={STUDENT_TYPE_OPTIONS}
            />
            <Input
              id="edit-department"
              label="Department"
              value={editingForm.department}
              onChange={(event) => setEditingForm({ ...editingForm, department: event.target.value })}
            />
            <Input
              id="edit-research-area"
              label="Research Area"
              value={editingForm.researchArea}
              onChange={(event) => setEditingForm({ ...editingForm, researchArea: event.target.value })}
            />
            <Input
              id="edit-photo"
              label="Profile Photo URL"
              value={editingForm.profilePhoto}
              onChange={(event) => setEditingForm({ ...editingForm, profilePhoto: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmStudent !== null}
        onClose={() => setConfirmStudent(null)}
        title={`${confirmStudent?.user?.isActive === false ? 'Activate' : 'Deactivate'} student`}
        message={
          <>
            Are you sure you want to {confirmStudent?.user?.isActive === false ? 'activate' : 'deactivate'}{' '}
            <span className="font-medium">{confirmStudent?.user?.name ?? 'this student'}</span>'s account?
          </>
        }
        confirmLabel={confirmStudent?.user?.isActive === false ? 'Activate' : 'Deactivate'}
        confirmVariant={confirmStudent?.user?.isActive === false ? 'primary' : 'danger'}
        busy={toggling}
        busyLabel="Saving…"
        error={toggleError ?? undefined}
        onConfirm={handleToggle}
      />
    </>
  );
}

export default StudentManagement;