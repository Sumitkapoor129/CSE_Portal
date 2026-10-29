import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
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
import { cn } from '../../utils/cn';
import { APPROVAL_STATUS_LABELS, APPROVAL_STATUS_STYLE } from '../../utils/constants';
import {
  calculateCurrentSemester,
  formatSemesterDateRange,
  getAllSemestersUpToCurrent,
  type SemesterInfo,
} from '../../utils/semester';
import type { DocumentView, Semester } from '../../types';

const openLinkClass = 'text-xs font-medium text-blue-600 hover:text-blue-700';

function getDocSemesterNumber(doc: DocumentView, admissionDate?: string): number {
  if (typeof doc.semesterNumber === 'number' && doc.semesterNumber >= 1) {
    return doc.semesterNumber;
  }
  if (doc.semester && typeof doc.semester === 'object' && typeof (doc.semester as Semester).semesterNumber === 'number') {
    return (doc.semester as Semester).semesterNumber;
  }
  if (admissionDate && doc.uploadDate) {
    return calculateCurrentSemester(admissionDate, doc.uploadDate);
  }
  return 1;
}

export function StudentDocuments(): JSX.Element {
  const { user } = useAuth();
  const [active, setActive] = useState('documents');

  const {
    data: documents,
    loading: documentsLoading,
    error: documentsError,
    refetch: refetchDocuments,
  } = useApi(studentApi.getDocuments);

  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useApi(studentApi.getProfile);

  const {
    data: forms,
    loading: formsLoading,
    error: formsError,
    refetch: refetchForms,
  } = useApi(
    (opts) => (active === 'forms' ? studentApi.getForms(opts) : Promise.resolve([])),
    [active]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const [deletingDocument, setDeletingDocument] = useState<DocumentView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [expandedSemesters, setExpandedSemesters] = useState<Record<number, boolean>>({});

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const semesterList: SemesterInfo[] = useMemo(() => {
    return getAllSemestersUpToCurrent(profile?.admissionDate);
  }, [profile?.admissionDate]);

  const currentSemesterNumber = useMemo(() => {
    const current = semesterList.find((s) => s.isCurrent);
    return current?.semesterNumber ?? 1;
  }, [semesterList]);



  const toggleSemester = (semNum: number) => {
    setExpandedSemesters((prev) => {
      const isCurrentlyOpen = prev[semNum] ?? (semNum === currentSemesterNumber);
      return { ...prev, [semNum]: !isCurrentlyOpen };
    });
  };

  const docsBySemester = useMemo(() => {
    const map: Record<number, DocumentView[]> = {};
    for (const sem of semesterList) {
      map[sem.semesterNumber] = [];
    }
    for (const doc of documents ?? []) {
      const semNum = getDocSemesterNumber(doc, profile?.admissionDate);
      if (!map[semNum]) {
        map[semNum] = [];
      }
      map[semNum].push(doc);
    }
    return map;
  }, [documents, semesterList, profile?.admissionDate]);

  const openModal = (preselectedSemester?: number) => {
    setDocumentName('');
    setDocumentType('');
    setFileUrl('');
    setSelectedFile(null);
    setSelectedSemester(preselectedSemester ?? currentSemesterNumber);
    setFormError(null);
    setModalOpen(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setFormError('File size exceeds the 25MB limit.');
      event.target.value = '';
      setSelectedFile(null);
      return;
    }
    setFormError(null);
    setSelectedFile(file);
    if (!documentName.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setDocumentName(baseName);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (!documentName.trim()) {
      setFormError('Document name is required.');
      return;
    }

    if (!selectedFile && !fileUrl.trim()) {
      setFormError('Please select a file to upload or enter a valid file URL.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('documentName', documentName.trim());
        formData.append('documentType', documentType.trim() || 'General');
        formData.append('semesterNumber', String(selectedSemester));
        await studentApi.uploadDocumentFile(formData);
      } else {
        await studentApi.uploadDocument({
          documentName: documentName.trim(),
          documentType: documentType.trim() || 'General',
          fileUrl: fileUrl.trim(),
          semesterNumber: selectedSemester,
        });
      }

      setModalOpen(false);
      setSubmitting(false);
      setSuccessNote('Document uploaded successfully.');
      refetchDocuments();
    } catch (err: unknown) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Unable to upload the document. Please try again.';
      setFormError(msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDocument || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await studentApi.deleteDocument(deletingDocument._id);
      setDeletingDocument(null);
      setSuccessNote('Document deleted successfully.');
      refetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete document.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const loadingState = documentsLoading || profileLoading || (active === 'forms' && formsLoading);
  const errorState = documentsError ?? profileError ?? (active === 'forms' ? formsError : null);

  const semesterOptions = useMemo(
    () =>
      semesterList.map((s) => ({
        value: String(s.semesterNumber),
        label: s.isCurrent ? `Semester ${s.semesterNumber} (Current)` : `Semester ${s.semesterNumber}`,
      })),
    [semesterList]
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description="Upload and access your academic documents and forms semester-wise."
        actions={
          active === 'documents' ? (
            <Button onClick={() => openModal()}>
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

      {successNote && (
        <div className="mt-4">
          <Alert variant="success" onDismiss={() => setSuccessNote(null)}>
            {successNote}
          </Alert>
        </div>
      )}

      <div className="mt-6">
        {loadingState && <SkeletonTable rows={4} />}

        {errorState && !loadingState && (
          <QueryError
            error={errorState}
            onRetry={() => {
              refetchProfile();
              if (active === 'forms') {
                refetchForms();
              } else {
                refetchDocuments();
              }
            }}
          />
        )}

        {!loadingState && !errorState && active === 'documents' && (
          <div id="tabpanel-documents" role="tabpanel" aria-labelledby="tab-documents" className="space-y-4">
            {semesterList.map((sem) => {
              const semDocs = docsBySemester[sem.semesterNumber] ?? [];
              const isOpen = expandedSemesters[sem.semesterNumber] ?? sem.isCurrent;

              return (
                <div
                  key={sem.semesterNumber}
                  className={cn("overflow-hidden rounded-lg border bg-white", sem.isCurrent ? "border-blue-200" : "border-gray-200")}
                >
                  <h3 className="m-0">
                    <button
                      type="button"
                      id={`semester-header-${sem.semesterNumber}`}
                      onClick={() => toggleSemester(sem.semesterNumber)}
                      className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-expanded={isOpen}
                      aria-controls={`semester-panel-${sem.semesterNumber}`}
                    >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-semibold text-gray-900">
                        {sem.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatSemesterDateRange(sem.startDate, sem.endDate)}
                      </span>
                      {sem.isCurrent && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                          Current Semester
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {semDocs.length} {semDocs.length === 1 ? 'document' : 'documents'}
                      </span>
                      <svg
                        className={cn(
                          'h-5 w-5 text-gray-400 transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  </h3>

                  {isOpen && (
                    <div id={`semester-panel-${sem.semesterNumber}`} role="region" aria-labelledby={`semester-header-${sem.semesterNumber}`} className="border-t border-gray-100">
                      {semDocs.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm text-gray-500">
                            No documents uploaded for this semester
                          </p>
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openModal(sem.semesterNumber)}
                            >
                              + Upload Document
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Table
                          columns={[
                            { key: 'name', header: 'Document Name' },
                            { key: 'type', header: 'Type' },
                            { key: 'uploaded', header: 'Upload Date' },
                            { key: 'status', header: 'Status' },
                            { key: 'actions', header: 'Actions', className: 'text-right' },
                          ]}
                        >
                          {semDocs.map((doc) => (
                            <TableRow key={doc._id}>
                              <TableCell className="font-medium text-gray-900">
                                {doc.documentName}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {doc.documentType || '—'}
                              </TableCell>
                              <TableCell className="text-gray-500">
                                {formatDate(doc.uploadDate)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  label={APPROVAL_STATUS_LABELS[doc.approvalStatus] ?? doc.approvalStatus}
                                  className={APPROVAL_STATUS_STYLE[doc.approvalStatus]}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={openLinkClass}
                                  >
                                    Open <span className="sr-only">document {doc.documentName}</span>
                                  </a>
                                  <a
                                    href={doc.fileUrl}
                                    download={doc.documentName}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                  >
                                    Download <span className="sr-only">document {doc.documentName}</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingDocument(doc)}
                                    className="text-xs font-medium text-red-600 hover:text-red-700"
                                  >
                                    Delete <span className="sr-only">document {doc.documentName}</span>
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loadingState && !errorState && active === 'forms' && (
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
            required
          />

          <Input
            id="doc-type"
            label="Document Type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            placeholder="e.g. Certificate, Report, Thesis"
          />

          <Select
            id="doc-semester"
            label="Semester"
            value={String(selectedSemester)}
            onChange={(event) => setSelectedSemester(Number(event.target.value))}
            options={semesterOptions}
          />

          <div>
            <label
              htmlFor="doc-file"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              File Upload
            </label>
            <input
              id="doc-file"
              type="file"
              aria-describedby="doc-file-desc"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              className="block w-full cursor-pointer rounded-md border border-gray-300 bg-white p-1 text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Accepts .pdf, .doc, .docx, .png, .jpg, .jpeg, .webp (max 25MB)
            </p>
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-3 flex-shrink text-xs uppercase tracking-wider text-gray-400">or file url</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <Input
            id="doc-url"
            label="File URL (Fallback)"
            value={fileUrl}
            onChange={(event) => {
              setFileUrl(event.target.value);
              if (selectedFile) setSelectedFile(null);
            }}
            placeholder="https://example.com/document.pdf"
            hint="Provide a link if you are not uploading a local file."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deletingDocument)}
        title="Delete Document"
        message={
          deletingDocument ? (
            <>
              Are you sure you want to delete <strong>{deletingDocument.documentName}</strong>?
              This action cannot be undone.
            </>
          ) : ''
        }
        confirmLabel="Delete Document"
        busyLabel="Deleting…"
        busy={isDeleting}
        error={deleteError ?? undefined}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) {
            setDeletingDocument(null);
            setDeleteError(null);
          }
        }}
      />
    </>
  );
}

export default StudentDocuments;