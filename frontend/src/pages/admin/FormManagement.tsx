import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { STUDENT_TYPE_LABELS, STUDENT_TYPE_OPTIONS } from '../../utils/constants';
import type { Form, StudentType } from '../../types';

const EMPTY_FORM = {
  formName: '',
  formType: '',
  fileUrl: '',
  semesterApplicable: '',
  department: '',
};

export function FormManagement(): JSX.Element {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useApi(
    () => adminApi.listForms({ page, limit: 10 }),
    [page]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Form | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [types, setTypes] = useState<StudentType[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const forms = data?.forms ?? [];
  const pagination = data?.pagination;

  const toggleType = (value: StudentType) => {
    setTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const parseSemesters = (value: string): number[] | undefined => {
    const numbers = value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
    return numbers.length > 0 ? numbers : undefined;
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTypes([]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Form) => {
    setEditing(item);
    setForm({
      formName: item.formName,
      formType: item.formType,
      fileUrl: item.fileUrl,
      semesterApplicable: item.semesterApplicable?.join(', ') ?? '',
      department: item.department ?? '',
    });
    setTypes(item.studentTypeApplicable ?? []);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setSubmitting(false);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.formName.trim() || !form.formType.trim() || !form.fileUrl.trim()) {
      setFormError('Form name, form type, and file URL are required.');
      return;
    }
    const payload = {
      formName: form.formName.trim(),
      formType: form.formType.trim(),
      fileUrl: form.fileUrl.trim(),
      semesterApplicable: parseSemesters(form.semesterApplicable),
      studentTypeApplicable: types.length > 0 ? types : undefined,
      department: form.department.trim() || undefined,
    };
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await adminApi.updateForm(editing._id, payload);
      } else {
        await adminApi.createForm(payload);
      }
      closeModal();
      setSuccessMessage(editing ? 'Form updated successfully.' : 'Form created successfully.');
      setPage(1);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to save the form. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteForm(confirmDelete._id);
      setDeleteError(null);
      setConfirmDelete(null);
      setDeleting(false);
      setSuccessMessage('Form deleted successfully.');
      refetch();
    } catch {
      setDeleting(false);
      setDeleteError('Unable to delete the form. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Form Management"
        description="Manage downloadable forms and templates available to students."
        actions={<Button onClick={openCreate}>Add Form</Button>}
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
        <Card title="Forms" padded={false}>
          <Table
            columns={[
              { key: 'formName', header: 'Form Name' },
              { key: 'formType', header: 'Form Type' },
              { key: 'semesterApplicable', header: 'Semesters' },
              { key: 'studentTypeApplicable', header: 'Applicable To' },
              { key: 'actions', header: 'Actions' },
            ]}
          >
            {forms.length === 0 ? (
              <TableEmpty colSpan={5} message="No forms found." />
            ) : (
              forms.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="font-medium text-gray-900">{item.formName}</TableCell>
                  <TableCell className="text-gray-700">{item.formType}</TableCell>
                  <TableCell className="text-gray-700">
                    {item.semesterApplicable && item.semesterApplicable.length > 0
                      ? item.semesterApplicable.join(', ')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {item.studentTypeApplicable && item.studentTypeApplicable.length > 0
                      ? item.studentTypeApplicable.map((type) => STUDENT_TYPE_LABELS[type]).join(', ')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null);
                          setConfirmDelete(item);
                        }}
                      >
                        Delete
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Form' : 'Add Form'}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            id="form-name"
            label="Form Name"
            value={form.formName}
            onChange={(event) => setForm({ ...form, formName: event.target.value })}
            placeholder="e.g. Thesis Submission Form"
          />
          <Input
            id="form-type"
            label="Form Type"
            value={form.formType}
            onChange={(event) => setForm({ ...form, formType: event.target.value })}
            placeholder="e.g. thesis"
          />
          <Input
            id="form-file-url"
            label="File URL"
            value={form.fileUrl}
            onChange={(event) => setForm({ ...form, fileUrl: event.target.value })}
            placeholder="https://..."
          />
          <Input
            id="form-semesters"
            label="Applicable Semesters"
            value={form.semesterApplicable}
            onChange={(event) => setForm({ ...form, semesterApplicable: event.target.value })}
            hint="Comma-separated numbers, optional. Empty means all semesters."
          />
          <Input
            id="form-department"
            label="Department"
            value={form.department}
            onChange={(event) => setForm({ ...form, department: event.target.value })}
            hint="Optional"
          />
          <fieldset>
            <legend className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Applicable Student Types
            </legend>
            <div className="flex items-center gap-4">
              {STUDENT_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={types.includes(option.value)}
                    onChange={() => toggleType(option.value)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">Empty means applicable to all student types.</p>
          </fieldset>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create form'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete Form"
        message={
          <>
            Are you sure you want to delete <span className="font-medium">{confirmDelete?.formName}</span>? This cannot
            be undone.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        busyLabel="Deleting…"
        error={deleteError ?? undefined}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default FormManagement;