import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { DueDateCell } from '../../components/student/DueDateCell';
import { formatDate } from '../../utils/formatDate';

const EMPTY_FORM = {
  title: '',
  description: '',
  dueDate: '',
  semester: '',
  student: '',
};

function ScopeBadge({ deadline }: { deadline: { semester?: unknown; student?: unknown } }) {
  const scope = deadline.student
    ? { label: 'Student', className: 'bg-green-50 text-green-700 border-green-200' }
    : deadline.semester
      ? { label: 'Semester', className: 'bg-blue-50 text-blue-700 border-blue-200' }
      : { label: 'Global', className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return (
    <Badge
      label={scope.label}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${scope.className}`}
    />
  );
}

export function DeadlineManagement(): JSX.Element {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (opts) => adminApi.listDeadlines({ page, limit: 10 }, opts),
    [page]
  );
  const studentsReq = useApi((opts) => adminApi.listStudents({ limit: 100 }, opts), []);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const deadlines = data?.deadlines ?? [];
  const pagination = data?.pagination;
  const students = studentsReq.data?.students ?? [];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const closeCreate = () => {
    setModalOpen(false);
    setSubmitting(false);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.title.trim() || !form.dueDate) {
      setFormError('Title and due date are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await adminApi.createDeadline({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: form.dueDate,
        semester: form.semester ? Number(form.semester) : undefined,
        student: form.student || undefined,
      });
      closeCreate();
      setSuccessMessage('Deadline created successfully.');
      setPage(1);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to create the deadline. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Deadline Management"
        description="Notify scholars about upcoming deadlines."
        actions={<Button onClick={openCreate}>Add Deadline</Button>}
      />
      {successMessage && (
        <div className="mb-6">
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </div>
      )}
      {loading && <SkeletonTable rows={5} columns={5} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && (
        <Card title="Deadlines" padded={false}>
          <Table
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'description', header: 'Description' },
              { key: 'dueDate', header: 'Due Date' },
              { key: 'scope', header: 'Scope' },
              { key: 'due', header: 'Due' },
            ]}
          >
            {deadlines.length === 0 ? (
              <TableEmpty colSpan={5} message="No deadlines found." />
            ) : (
              deadlines.map((deadline) => (
                <TableRow key={deadline._id}>
                  <TableCell className="font-medium text-gray-900">{deadline.title}</TableCell>
                  <TableCell className="text-gray-500">{deadline.description || '—'}</TableCell>
                  <TableCell className="text-gray-700">{formatDate(deadline.dueDate)}</TableCell>
                  <TableCell>
                    <ScopeBadge deadline={deadline} />
                  </TableCell>
                  <TableCell>
                    <DueDateCell date={deadline.dueDate} variant="overdue-count" />
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

      <Modal open={modalOpen} onClose={closeCreate} title="Add Deadline">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            id="deadline-title"
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Course Work Submission"
          />
          <Input
            id="deadline-description"
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Optional"
          />
          <Input
            id="deadline-due"
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
          <Input
            id="deadline-semester"
            label="Semester"
            type="number"
            min={1}
            value={form.semester}
            onChange={(event) => setForm({ ...form, semester: event.target.value })}
            hint="Optional. Blank means the deadline is global."
          />
          <Select
            id="deadline-student"
            label="Student"
            value={form.student}
            onChange={(event) => setForm({ ...form, student: event.target.value })}
            options={[
              { value: '', label: 'All students' },
              ...students.map((student) => ({
                value: student._id,
                label: `${student.user?.name ?? 'Unknown'} · ${student.rollNumber}`,
              })),
            ]}
          />
          <p className="text-xs text-gray-500">
            Leave both semester and student blank to target all scholars.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeCreate}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create deadline'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default DeadlineManagement;