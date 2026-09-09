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
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import { THESIS_STATUS_LABELS, THESIS_STATUS_STYLE } from '../../utils/constants';

export function StudentThesis(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(studentApi.getTheses);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const theses = data ? [...data].sort((a, b) => b.version - a.version) : [];

  const openModal = () => {
    setTitle('');
    setDocumentUrl('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!title.trim() || !documentUrl.trim()) {
      setFormError('Title and document URL are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await studentApi.submitThesis({
        title: title.trim(),
        documentUrl: documentUrl.trim(),
      });
      setModalOpen(false);
      setSubmitting(false);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to submit your thesis. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Thesis"
        description="Submit and track versions of your doctoral thesis."
        actions={
          <Button onClick={openModal} variant="secondary">
            Submit Thesis
          </Button>
        }
      />
      {loading && <SkeletonTable rows={4} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && (
        <Card title="Thesis" padded={false}>
          <Table
            columns={[
              { key: 'version', header: 'Version' },
              { key: 'title', header: 'Title' },
              { key: 'status', header: 'Status' },
              { key: 'submitted', header: 'Submitted' },
              { key: 'comments', header: 'Supervisor Comments' },
            ]}
          >
            {theses.length === 0 ? (
              <TableEmpty colSpan={5} message="No thesis versions submitted yet." />
            ) : (
              theses.map((thesis) => (
                <TableRow key={thesis._id}>
                  <TableCell className="font-medium text-gray-900">{thesis.version}</TableCell>
                  <TableCell className="text-gray-700">{thesis.title}</TableCell>
                  <TableCell>
                    <Badge label={THESIS_STATUS_LABELS[thesis.status]} className={THESIS_STATUS_STYLE[thesis.status]} />
                  </TableCell>
                  <TableCell className="text-gray-500">{formatDate(thesis.submissionDate)}</TableCell>
                  <TableCell className="text-gray-500">
                    {thesis.supervisorComments ? (
                      <p className="max-w-md text-xs">{thesis.supervisorComments}</p>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Thesis">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            id="thesis-title"
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Thesis title"
          />
          <Input
            id="thesis-url"
            label="Document URL"
            value={documentUrl}
            onChange={(event) => setDocumentUrl(event.target.value)}
            placeholder="https://example.com/thesis.pdf"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit thesis'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default StudentThesis;