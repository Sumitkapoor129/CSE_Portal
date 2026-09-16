import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import { APPROVAL_STATUS_LABELS, APPROVAL_STATUS_STYLE } from '../../utils/constants';

const openLinkClass = 'text-sm font-medium text-blue-600 hover:text-blue-700';

export function StudentDocuments(): JSX.Element {
  const { user } = useAuth();
  const [active, setActive] = useState('documents');
  const { data: documents, loading: documentsLoading, error: documentsError, refetch: refetchDocuments } =
    useApi(studentApi.getDocuments);
  const { data: forms, loading: formsLoading, error: formsError, refetch: refetchForms } = useApi(
    () => (active === 'forms' ? studentApi.getForms() : Promise.resolve([])),
    [active]
  );
  const { data: semesters } = useApi(studentApi.getSemesters);

  const [modalOpen, setModalOpen] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const semesterList = semesters ?? [];

  const openModal = () => {
    setDocumentName('');
    setDocumentType('');
    setFileUrl('');
    setSemesterId('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!documentName.trim() || !documentType.trim() || !fileUrl.trim()) {
      setFormError('Document name, type and URL are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await studentApi.uploadDocument({
        documentName: documentName.trim(),
        documentType: documentType.trim(),
        fileUrl: fileUrl.trim(),
        ...(semesterId ? { semester: semesterId } : {}),
      });
      setModalOpen(false);
      setSubmitting(false);
      refetchDocuments();
    } catch {
      setSubmitting(false);
      setFormError('Unable to upload the document. Please try again.');
    }
  };

  const documentsLoadingState = documentsLoading || (active === 'forms' && formsLoading);
  const documentsErrorState = documentsError ?? (active === 'forms' ? formsError : null);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Upload and access your academic documents and forms."
        actions={
          active === 'documents' ? (
            <Button onClick={openModal} variant="secondary">
              Upload Document
            </Button>
          ) : undefined
        }
      />
      <Tabs
        tabs={[
          { key: 'documents', label: 'Documents' },
          { key: 'forms', label: 'Forms' },
        ]}
        active={active}
        onChange={setActive}
      />
      <div className="mt-6">
        {documentsLoadingState && <SkeletonTable rows={4} />}
        {documentsErrorState && !documentsLoadingState && (
          <QueryError error={documentsErrorState} onRetry={() => (active === 'forms' ? refetchForms() : refetchDocuments())} />
        )}
        {!documentsLoadingState && !documentsErrorState && active === 'documents' && (
          <Card padded={false}>
            <Table
              columns={[
                { key: 'name', header: 'Document' },
                { key: 'type', header: 'Type' },
                { key: 'uploaded', header: 'Uploaded' },
                { key: 'status', header: 'Status' },
                { key: 'open', header: 'Open' },
              ]}
            >
              {(documents ?? []).length === 0 ? (
                <TableEmpty colSpan={5} message="No documents uploaded yet." />
              ) : (
                (documents ?? []).map((document) => (
                  <TableRow key={document._id}>
                    <TableCell className="font-medium text-gray-900">{document.documentName}</TableCell>
                    <TableCell className="text-gray-700">{document.documentType}</TableCell>
                    <TableCell className="text-gray-500">{formatDate(document.uploadDate)}</TableCell>
                    <TableCell>
                      <Badge
                        label={APPROVAL_STATUS_LABELS[document.approvalStatus]}
                        className={APPROVAL_STATUS_STYLE[document.approvalStatus]}
                      />
                    </TableCell>
                    <TableCell>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" className={openLinkClass}>
                        Open
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </Card>
        )}
        {!documentsLoadingState && !documentsErrorState && active === 'forms' && (
          <Card padded={false}>
            <Table
              columns={[
                { key: 'name', header: 'Form' },
                { key: 'type', header: 'Type' },
                { key: 'open', header: 'Open' },
              ]}
            >
              {(forms ?? []).length === 0 ? (
                <TableEmpty colSpan={3} message="No forms available." />
              ) : (
                (forms ?? []).map((form) => (
                  <TableRow key={form._id}>
                    <TableCell className="font-medium text-gray-900">{form.formName}</TableCell>
                    <TableCell className="text-gray-700">{form.formType}</TableCell>
                    <TableCell>
                      <a href={form.fileUrl} target="_blank" rel="noreferrer" className={openLinkClass}>
                        Open form
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload Document">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            id="doc-name"
            label="Document Name"
            value={documentName}
            onChange={(event) => setDocumentName(event.target.value)}
            placeholder="e.g. Plagiarism Certificate"
          />
          <Input
            id="doc-type"
            label="Document Type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            placeholder="e.g. Certificate"
          />
          <Input
            id="doc-url"
            label="File URL"
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            placeholder="https://example.com/document.pdf"
          />
          <Select
            value={semesterId}
            onChange={(event) => setSemesterId(event.target.value)}
            options={[{ value: '', label: 'No semester' }, ...semesterList.map((semester) => ({
              value: semester._id,
              label: `Semester ${semester.semesterNumber} · ${semester.academicYear}`,
            }))]}
            id="doc-semester"
            label="Semester (optional)"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default StudentDocuments;