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
import { formatDate } from '../../utils/formatDate';
import {
  ACTIVE_STATUS_STYLE,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_STYLE,
  INACTIVE_STATUS_STYLE,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLE,
  STUDENT_TYPE_LABELS,
  STUDENT_TYPE_OPTIONS,
} from '../../utils/constants';
import type {
  Milestone,
  MilestoneStatus,
  StudentCourse,
  StudentProfileView,
  StudentType,
} from '../../types';

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
  const [appliedDepartment, setAppliedDepartment] = useState('');
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

  const [milestonesStudent, setMilestonesStudent] = useState<StudentProfileView | null>(null);
  const [studentMilestones, setStudentMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState<string | null>(null);
  const [milestoneActionError, setMilestoneActionError] = useState<string | null>(null);

  // Admin direct student course management states
  const [coursesStudent, setCoursesStudent] = useState<StudentProfileView | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [courseActionError, setCourseActionError] = useState<string | null>(null);
  const [courseActionSuccess, setCourseActionSuccess] = useState<string | null>(null);

  // Add course form state
  const [newSemesterNumber, setNewSemesterNumber] = useState<number>(1);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCredits, setNewCourseCredits] = useState<number>(4);
  const [newCourseStatus, setNewCourseStatus] = useState<'completed' | 'pending'>('completed');
  const [newCourseGrade, setNewCourseGrade] = useState('');
  const [addingCourse, setAddingCourse] = useState(false);

  // Edit course state
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseCredits, setEditCourseCredits] = useState<number>(4);
  const [editCourseStatus, setEditCourseStatus] = useState<'completed' | 'pending'>('completed');
  const [editCourseGrade, setEditCourseGrade] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedName(name);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedDepartment(department);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [department]);

  const { data, loading, error, refetch } = useApi(
    (opts) =>
      adminApi.listStudents({
        search: appliedName || undefined,
        studentType: studentType || undefined,
        department: appliedDepartment || undefined,
        page,
        limit: 10,
      }, opts),
    [appliedName, studentType, appliedDepartment, page]
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
    } catch (err: unknown) {
      setCreating(false);
      setCreateError(err instanceof Error ? err.message : 'Unable to create the student. Please try again.');
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
    } catch (err: unknown) {
      setSavingEdit(false);
      setEditError(err instanceof Error ? err.message : 'Unable to update the student. Please try again.');
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
    } catch (err: unknown) {
      setToggling(false);
      setToggleError(err instanceof Error ? err.message : 'Unable to update account status. Please try again.');
    }
  };

  const openMilestones = async (student: StudentProfileView) => {
    setMilestonesStudent(student);
    setStudentMilestones([]);
    setMilestonesError(null);
    setMilestoneActionError(null);
    setMilestonesLoading(true);
    try {
      const data = await adminApi.getStudentMilestones(student._id);
      setStudentMilestones(data);
    } catch (err) {
      setMilestonesError(err instanceof Error ? err.message : 'Failed to load scholar milestones.');
    } finally {
      setMilestonesLoading(false);
    }
  };

  const closeMilestones = () => {
    setMilestonesStudent(null);
    setStudentMilestones([]);
    setMilestonesError(null);
    setMilestoneActionError(null);
    setUpdatingMilestoneId(null);
  };

  const handleUpdateMilestoneStatus = async (milestoneId: string, status: MilestoneStatus) => {
    setUpdatingMilestoneId(milestoneId);
    setMilestoneActionError(null);
    try {
      const updated = await adminApi.updateMilestone(milestoneId, { status });
      setStudentMilestones((prev) =>
        prev.map((m) => (m._id === milestoneId ? { ...m, ...updated } : m))
      );
      const label = status === 'completed' ? 'Approved' : status === 'rejected' ? 'Rejected' : status;
      setSuccessMessage(`Milestone updated to ${label}.`);
    } catch (err) {
      setMilestoneActionError(err instanceof Error ? err.message : 'Failed to update milestone status.');
    } finally {
      setUpdatingMilestoneId(null);
    }
  };

  const fetchStudentCourses = async (studentId: string) => {
    const res = await adminApi.getStudentCourses(studentId);
    setStudentCourses(res.studentCourses || []);
  };

  const openCourses = async (student: StudentProfileView) => {
    setCoursesStudent(student);
    setCoursesLoading(true);
    setCoursesError(null);
    setCourseActionError(null);
    setCourseActionSuccess(null);
    setEditingCourseId(null);
    setNewCourseCode('');
    setNewCourseName('');
    setNewCourseCredits(4);
    setNewCourseStatus('completed');
    setNewCourseGrade('');
    setNewSemesterNumber(1);
    try {
      await fetchStudentCourses(student._id);
    } catch (err) {
      setCoursesError(err instanceof Error ? err.message : 'Failed to load courses.');
    } finally {
      setCoursesLoading(false);
    }
  };

  const closeCourses = () => {
    setCoursesStudent(null);
    setStudentCourses([]);
    setCoursesError(null);
    setCourseActionError(null);
    setCourseActionSuccess(null);
    setEditingCourseId(null);
  };

  const handleAddCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!coursesStudent || addingCourse) return;
    if (!newCourseCode.trim() || !newCourseName.trim()) {
      setCourseActionError('Course code and name are required.');
      return;
    }
    setAddingCourse(true);
    setCourseActionError(null);
    setCourseActionSuccess(null);
    try {
      await adminApi.addStudentCourse(coursesStudent._id, {
        semesterNumber: Number(newSemesterNumber) || 1,
        courseCode: newCourseCode.trim().toUpperCase(),
        courseName: newCourseName.trim(),
        credits: Number(newCourseCredits) || 0,
        status: newCourseStatus,
        grade: newCourseGrade.trim() || undefined,
      });
      setNewCourseCode('');
      setNewCourseName('');
      setNewCourseGrade('');
      setCourseActionSuccess('Course added directly and credits awarded immediately.');
      await fetchStudentCourses(coursesStudent._id);
    } catch (err) {
      setCourseActionError(err instanceof Error ? err.message : 'Failed to add course.');
    } finally {
      setAddingCourse(false);
    }
  };

  const startEditCourse = (sc: StudentCourse) => {
    const courseObj = typeof sc.course === 'object' && sc.course !== null ? sc.course : null;
    setEditingCourseId(sc._id);
    setEditCourseCode(courseObj?.courseCode || '');
    setEditCourseName(courseObj?.courseName || '');
    setEditCourseCredits(courseObj?.credits ?? 4);
    setEditCourseStatus(sc.status === 'completed' ? 'completed' : 'pending');
    setEditCourseGrade(courseObj?.grade || '');
    setCourseActionError(null);
    setCourseActionSuccess(null);
  };

  const handleSaveEditCourse = async (studentCourseId: string) => {
    if (!coursesStudent || savingCourse) return;
    setSavingCourse(true);
    setCourseActionError(null);
    setCourseActionSuccess(null);
    try {
      await adminApi.updateStudentCourse(coursesStudent._id, studentCourseId, {
        courseCode: editCourseCode.trim().toUpperCase(),
        courseName: editCourseName.trim(),
        credits: Number(editCourseCredits),
        status: editCourseStatus,
        grade: editCourseGrade.trim() || undefined,
      });
      setEditingCourseId(null);
      setCourseActionSuccess('Course updated successfully.');
      await fetchStudentCourses(coursesStudent._id);
    } catch (err) {
      setCourseActionError(err instanceof Error ? err.message : 'Failed to update course.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (studentCourseId: string) => {
    if (!coursesStudent) return;
    if (!window.confirm('Are you sure you want to delete this course record?')) return;
    setCourseActionError(null);
    setCourseActionSuccess(null);
    try {
      await adminApi.deleteStudentCourse(coursesStudent._id, studentCourseId);
      setCourseActionSuccess('Course deleted successfully.');
      await fetchStudentCourses(coursesStudent._id);
    } catch (err) {
      setCourseActionError(err instanceof Error ? err.message : 'Failed to delete course.');
    }
  };

  const handleToggleCourseStatus = async (sc: StudentCourse) => {
    if (!coursesStudent) return;
    const newStatus = sc.status === 'completed' ? 'pending' : 'completed';
    setCourseActionError(null);
    setCourseActionSuccess(null);
    try {
      await adminApi.updateStudentCourse(coursesStudent._id, sc._id, {
        status: newStatus,
      });
      setCourseActionSuccess(`Course marked as ${newStatus}.`);
      await fetchStudentCourses(coursesStudent._id);
    } catch (err) {
      setCourseActionError(err instanceof Error ? err.message : 'Failed to toggle course status.');
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
            ariaLabel="Students Directory"
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
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Manage courses for ${student.user?.name || student.rollNumber}`}
                        onClick={() => openCourses(student)}
                      >
                        Manage Courses
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`View milestones for ${student.user?.name || student.rollNumber}`}
                        onClick={() => openMilestones(student)}
                      >
                        Milestones
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Edit student ${student.user?.name || student.rollNumber}`}
                        onClick={() => openEdit(student)}
                      >
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

      <Modal
        open={milestonesStudent !== null}
        onClose={closeMilestones}
        title={milestonesStudent ? `PhD Milestones — ${milestonesStudent.user?.name ?? 'Scholar'}` : 'PhD Milestones'}
        maxWidth="xl"
      >
        <div className="space-y-4">
          {milestonesStudent && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 text-xs text-gray-500">
              <span>Roll No: <strong className="text-gray-700">{milestonesStudent.rollNumber}</strong></span>
              <span>College ID: <strong className="text-gray-700">{milestonesStudent.collegeId}</strong></span>
              <span>Type: <strong className="text-gray-700">{STUDENT_TYPE_LABELS[milestonesStudent.studentType]}</strong></span>
            </div>
          )}

          {milestoneActionError && <Alert variant="error">{milestoneActionError}</Alert>}
          {milestonesError && <Alert variant="error">{milestonesError}</Alert>}

          {milestonesLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading scholar milestones…</div>
          ) : studentMilestones.length === 0 && !milestonesError ? (
            <div className="py-8 text-center text-sm text-gray-500">No milestones found for this scholar.</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto pr-1">
              {studentMilestones.map((milestone) => (
                <li key={milestone._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                    {milestone.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
                      <Badge
                        label={MILESTONE_STATUS_LABELS[milestone.status] ?? milestone.status}
                        className={MILESTONE_STATUS_STYLE[milestone.status]}
                      />
                    </div>
                    {milestone.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{milestone.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                      {milestone.dueDate && <span>Due: {formatDate(milestone.dueDate)}</span>}
                      {milestone.completedAt && (
                        <span className="text-emerald-600">Completed: {formatDate(milestone.completedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant={milestone.status === 'completed' ? 'secondary' : 'primary'}
                      size="sm"
                      disabled={updatingMilestoneId === milestone._id || milestone.status === 'completed'}
                      onClick={() => handleUpdateMilestoneStatus(milestone._id, 'completed')}
                    >
                      {updatingMilestoneId === milestone._id ? 'Updating…' : milestone.status === 'completed' ? 'Approved' : 'Approve'}
                    </Button>
                    <Button
                      variant={milestone.status === 'rejected' ? 'secondary' : 'danger'}
                      size="sm"
                      disabled={updatingMilestoneId === milestone._id || milestone.status === 'rejected'}
                      onClick={() => handleUpdateMilestoneStatus(milestone._id, 'rejected')}
                    >
                      {milestone.status === 'rejected' ? 'Rejected' : 'Reject'}
                    </Button>
                    {milestone.status !== 'pending' && milestone.status !== 'in_progress' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={updatingMilestoneId === milestone._id}
                        onClick={() => handleUpdateMilestoneStatus(milestone._id, 'in_progress')}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end border-t border-gray-100 pt-3">
            <Button variant="secondary" onClick={closeMilestones}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={coursesStudent !== null}
        onClose={closeCourses}
        title={coursesStudent ? `Manage Courses — ${coursesStudent.user?.name ?? 'Scholar'}` : 'Manage Courses'}
        maxWidth="xl"
      >
        <div className="space-y-5">
          {coursesStudent && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 text-xs text-gray-500">
              <span>Roll No: <strong className="text-gray-700">{coursesStudent.rollNumber}</strong></span>
              <span>College ID: <strong className="text-gray-700">{coursesStudent.collegeId}</strong></span>
              <span>Department: <strong className="text-gray-700">{coursesStudent.department}</strong></span>
            </div>
          )}

          {/* Credits Summary Banner */}
          {(() => {
            const earned = studentCourses
              .filter((sc) => sc.status === 'completed' || sc.status === 'approved')
              .reduce((sum, sc) => {
                const c = typeof sc.course === 'object' && sc.course !== null ? sc.course : null;
                return sum + (c?.credits || 0);
              }, 0);
            const required = coursesStudent?.requiredCredits || 12;

            return (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                    Academic Credits Summary
                  </div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">
                    {earned} <span className="text-sm font-normal text-gray-600">/ {required} credits required</span>
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      earned >= required
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {earned >= required ? 'Requirement Fulfilled' : `${required - earned} Credits Remaining`}
                  </span>
                </div>
              </div>
            );
          })()}

          {courseActionSuccess && (
            <Alert variant="success" onDismiss={() => setCourseActionSuccess(null)}>
              {courseActionSuccess}
            </Alert>
          )}
          {courseActionError && (
            <Alert variant="error" onDismiss={() => setCourseActionError(null)}>
              {courseActionError}
            </Alert>
          )}
          {coursesError && <Alert variant="error">{coursesError}</Alert>}

          {/* Add Course Directly Form */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-3">
              Add Course Directly (Awards Credits Immediately)
            </h4>
            <form onSubmit={handleAddCourse} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  id="direct-course-sem"
                  label="Semester No."
                  type="number"
                  min={1}
                  value={String(newSemesterNumber)}
                  onChange={(e) => setNewSemesterNumber(Math.max(1, Number(e.target.value)))}
                />
                <Input
                  id="direct-course-code"
                  label="Course Code"
                  placeholder="e.g. CS601"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                />
                <Input
                  id="direct-course-name"
                  label="Course Name"
                  placeholder="e.g. Advanced Algorithms"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  id="direct-course-credits"
                  label="Credits"
                  type="number"
                  min={1}
                  value={String(newCourseCredits)}
                  onChange={(e) => setNewCourseCredits(Math.max(0, Number(e.target.value)))}
                />
                <Select
                  id="direct-course-status"
                  label="Status"
                  value={newCourseStatus}
                  onChange={(e) => setNewCourseStatus(e.target.value as 'completed' | 'pending')}
                  options={[
                    { value: 'completed', label: 'Completed (Immediate Credits)' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                />
                <Input
                  id="direct-course-grade"
                  label="Grade (Optional)"
                  placeholder="e.g. A, S, B+"
                  value={newCourseGrade}
                  onChange={(e) => setNewCourseGrade(e.target.value)}
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" disabled={addingCourse}>
                  {addingCourse ? 'Adding Course…' : '+ Add Course Directly'}
                </Button>
              </div>
            </form>
          </div>

          {/* Student Courses List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Registered Courses ({studentCourses.length})
            </h4>

            {coursesLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading scholar courses…</div>
            ) : studentCourses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500">
                No courses added for this scholar yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {studentCourses.map((sc) => {
                  const courseObj = typeof sc.course === 'object' && sc.course !== null ? sc.course : null;
                  const semObj = typeof sc.semester === 'object' && sc.semester !== null ? sc.semester : null;
                  const isEditing = editingCourseId === sc._id;

                  if (isEditing) {
                    return (
                      <div key={sc._id} className="rounded-lg border border-blue-300 bg-blue-50/40 p-3 space-y-3">
                        <div className="grid gap-2 sm:grid-cols-4">
                          <Input
                            id={`edit-c-code-${sc._id}`}
                            label="Code"
                            value={editCourseCode}
                            onChange={(e) => setEditCourseCode(e.target.value)}
                          />
                          <div className="sm:col-span-2">
                            <Input
                              id={`edit-c-name-${sc._id}`}
                              label="Name"
                              value={editCourseName}
                              onChange={(e) => setEditCourseName(e.target.value)}
                            />
                          </div>
                          <Input
                            id={`edit-c-cred-${sc._id}`}
                            label="Credits"
                            type="number"
                            value={String(editCourseCredits)}
                            onChange={(e) => setEditCourseCredits(Number(e.target.value))}
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Select
                            id={`edit-c-status-${sc._id}`}
                            label="Status"
                            value={editCourseStatus}
                            onChange={(e) => setEditCourseStatus(e.target.value as 'completed' | 'pending')}
                            options={[
                              { value: 'completed', label: 'Completed' },
                              { value: 'pending', label: 'Pending' },
                            ]}
                          />
                          <Input
                            id={`edit-c-grade-${sc._id}`}
                            label="Grade"
                            value={editCourseGrade}
                            onChange={(e) => setEditCourseGrade(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setEditingCourseId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" disabled={savingCourse} onClick={() => handleSaveEditCourse(sc._id)}>
                            {savingCourse ? 'Saving…' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={sc._id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{courseObj?.courseCode || '—'}</span>
                          <span className="text-sm text-gray-800">{courseObj?.courseName || '—'}</span>
                          <Badge
                            label={APPROVAL_STATUS_LABELS[sc.status] ?? sc.status}
                            className={APPROVAL_STATUS_STYLE[sc.status]}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>Semester: <strong>{semObj?.semesterNumber ?? '—'}</strong></span>
                          <span>Credits: <strong>{courseObj?.credits ?? 0}</strong></span>
                          {courseObj?.grade && <span>Grade: <strong className="text-gray-700">{courseObj.grade}</strong></span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleCourseStatus(sc)}
                        >
                          {sc.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}
                          <span className="sr-only"> for {courseObj?.courseCode || 'course'}</span>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startEditCourse(sc)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteCourse(sc._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-3">
            <Button variant="secondary" onClick={closeCourses}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default StudentManagement;