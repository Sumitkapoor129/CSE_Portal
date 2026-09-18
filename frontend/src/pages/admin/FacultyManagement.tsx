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
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { QueryError } from '../../components/shared/QueryError';
import { ACTIVE_STATUS_STYLE, INACTIVE_STATUS_STYLE } from '../../utils/constants';
import type { FacultyView } from '../../types';

const EMPTY_CREATE_FORM = {
  email: '',
  password: '',
  name: '',
  employeeId: '',
  department: '',
  designation: '',
  researchAreas: '',
};

const EMPTY_EDIT_FORM = {
  name: '',
  email: '',
  employeeId: '',
  department: '',
  designation: '',
  researchAreas: '',
  profilePhoto: '',
};

export function FacultyManagement(): JSX.Element {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [appliedDepartment, setAppliedDepartment] = useState('');
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(() => searchParams.get('create') === '1');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FacultyView | null>(null);
  const [editingForm, setEditingForm] = useState(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmFaculty, setConfirmFaculty] = useState<FacultyView | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedDepartment(department);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [department]);

  const { data, loading, error, refetch } = useApi(
    (opts) =>
      adminApi.listFaculty({
        search: appliedSearch || undefined,
        department: appliedDepartment || undefined,
        page,
        limit: 10,
      }, opts),
    [appliedSearch, appliedDepartment, page]
  );

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const faculty = data?.faculty ?? [];
  const pagination = data?.pagination;

  const hasFilters = Boolean(search || department);

  const clearFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setDepartment('');
    setAppliedDepartment('');
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
      !createForm.employeeId.trim() ||
      !createForm.department.trim() ||
      !createForm.designation.trim()
    ) {
      setCreateError('Email, password, name, employee ID, department, and designation are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await adminApi.createFaculty({
        email: createForm.email.trim(),
        password: createForm.password,
        name: createForm.name.trim(),
        employeeId: createForm.employeeId.trim(),
        department: createForm.department.trim(),
        designation: createForm.designation.trim(),
        researchAreas: createForm.researchAreas
          ? createForm.researchAreas.split(',').map((item) => item.trim()).filter(Boolean)
          : undefined,
      });
      closeCreate();
      setSuccessMessage('Faculty member created successfully.');
      setPage(1);
      refetch();
    } catch {
      setCreating(false);
      setCreateError('Unable to create the faculty member. Please try again.');
    }
  };

  const openEdit = (member: FacultyView) => {
    setEditing(member);
    setEditingForm({
      name: member.user?.name ?? '',
      email: member.user?.email ?? '',
      employeeId: member.employeeId,
      department: member.department,
      designation: member.designation,
      researchAreas: Array.isArray(member.researchAreas) ? member.researchAreas.join(', ') : '',
      profilePhoto: member.profilePhoto ?? '',
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
      await adminApi.updateFaculty(editing._id, {
        name: editingForm.name.trim() || undefined,
        email: editingForm.email.trim() || undefined,
        employeeId: editingForm.employeeId.trim() || undefined,
        department: editingForm.department.trim() || undefined,
        designation: editingForm.designation.trim() || undefined,
        researchAreas: editingForm.researchAreas
          ? editingForm.researchAreas.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
        profilePhoto: editingForm.profilePhoto.trim() || undefined,
      });
      closeEdit();
      setSuccessMessage('Faculty member updated successfully.');
      refetch();
    } catch {
      setSavingEdit(false);
      setEditError('Unable to update the faculty member. Please try again.');
    }
  };

  const handleToggle = async () => {
    if (!confirmFaculty || toggling) return;
    setToggling(true);
    setToggleError(null);
    try {
      await adminApi.toggleFacultyActive(confirmFaculty.user?._id ?? '');
      setSuccessMessage(
        confirmFaculty.user?.isActive ? 'Faculty account deactivated.' : 'Faculty account activated.'
      );
      setConfirmFaculty(null);
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
        title="Faculty Management"
        description="Create, edit, and manage faculty accounts."
        actions={<Button onClick={openCreate}>Add Faculty</Button>}
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
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            id="filter-name"
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or employee ID"
          />
          <Input
            id="filter-department"
            label="Department"
            value={department}
            onChange={(event) => {
              setDepartment(event.target.value);
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
        <Card title="Faculty" padded={false}>
          <Table
            columns={[
              { key: 'photo', header: 'Photo' },
              { key: 'name', header: 'Name' },
              { key: 'employeeId', header: 'Employee ID' },
              { key: 'department', header: 'Department' },
              { key: 'designation', header: 'Designation' },
              { key: 'status', header: 'Status' },
              { key: 'actions', header: 'Actions' },
            ]}
          >
            {faculty.length === 0 ? (
              <TableEmpty colSpan={7} message="No faculty found." />
            ) : (
              faculty.map((member) => (
                <TableRow key={member._id}>
                  <TableCell>
                    <Avatar name={member.user?.name ?? '—'} photo={member.profilePhoto ?? null} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{member.user?.name ?? '—'}</TableCell>
                  <TableCell className="text-gray-700">{member.employeeId}</TableCell>
                  <TableCell className="text-gray-700">{member.department}</TableCell>
                  <TableCell className="text-gray-700">{member.designation}</TableCell>
                  <TableCell>
                    <Badge
                      label={member.user?.isActive ? 'Active' : 'Inactive'}
                      className={member.user?.isActive === false ? inactiveStyle : activeStyle}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(member)}>
                        Edit
                      </Button>
                      <Button
                        variant={member.user?.isActive === false ? 'primary' : 'danger'}
                        size="sm"
                        aria-label={member.user?.isActive === false ? `Activate ${member.user?.name || 'faculty member'}` : `Deactivate ${member.user?.name || 'faculty member'}`}
                        onClick={() => {
                          setToggleError(null);
                          setConfirmFaculty(member);
                        }}
                      >
                        {member.user?.isActive === false ? 'Activate' : 'Deactivate'}
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

      <Modal open={createOpen} onClose={closeCreate} title="Add Faculty">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          {createError && <Alert variant="error">{createError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="create-email"
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
              placeholder="faculty@nitjsr.ac.in"
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
              placeholder="Faculty name"
            />
            <Input
              id="create-employee-id"
              label="Employee ID"
              value={createForm.employeeId}
              onChange={(event) => setCreateForm({ ...createForm, employeeId: event.target.value })}
              placeholder="e.g. NITJ/F/2021/042"
            />
            <Input
              id="create-department"
              label="Department"
              value={createForm.department}
              onChange={(event) => setCreateForm({ ...createForm, department: event.target.value })}
              placeholder="e.g. CSE"
            />
            <Input
              id="create-designation"
              label="Designation"
              value={createForm.designation}
              onChange={(event) => setCreateForm({ ...createForm, designation: event.target.value })}
              placeholder="e.g. Associate Professor"
            />
            <Input
              id="create-research-areas"
              label="Research Areas"
              value={createForm.researchAreas}
              onChange={(event) => setCreateForm({ ...createForm, researchAreas: event.target.value })}
              hint="Comma-separated, optional"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeCreate}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create faculty'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={closeEdit} title="Edit Faculty">
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
              id="edit-employee-id"
              label="Employee ID"
              value={editingForm.employeeId}
              onChange={(event) => setEditingForm({ ...editingForm, employeeId: event.target.value })}
            />
            <Input
              id="edit-department"
              label="Department"
              value={editingForm.department}
              onChange={(event) => setEditingForm({ ...editingForm, department: event.target.value })}
            />
            <Input
              id="edit-designation"
              label="Designation"
              value={editingForm.designation}
              onChange={(event) => setEditingForm({ ...editingForm, designation: event.target.value })}
            />
            <Input
              id="edit-research-areas"
              label="Research Areas"
              value={editingForm.researchAreas}
              onChange={(event) => setEditingForm({ ...editingForm, researchAreas: event.target.value })}
              hint="Comma-separated"
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
        open={confirmFaculty !== null}
        onClose={() => setConfirmFaculty(null)}
        title={`${confirmFaculty?.user?.isActive === false ? 'Activate' : 'Deactivate'} faculty`}
        message={
          <>
            Are you sure you want to {confirmFaculty?.user?.isActive === false ? 'activate' : 'deactivate'}{' '}
            <span className="font-medium">{confirmFaculty?.user?.name ?? 'this faculty member'}</span>'s account?
          </>
        }
        confirmLabel={confirmFaculty?.user?.isActive === false ? 'Activate' : 'Deactivate'}
        confirmVariant={confirmFaculty?.user?.isActive === false ? 'primary' : 'danger'}
        busy={toggling}
        busyLabel="Saving…"
        error={toggleError ?? undefined}
        onConfirm={handleToggle}
      />
    </>
  );
}

export default FacultyManagement;