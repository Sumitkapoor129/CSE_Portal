import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { supervisorApi } from '../../api/supervisor';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import { THESIS_STATUS_LABELS, THESIS_STATUS_STYLE } from '../../utils/constants';
import type { StudentCourse, Thesis } from '../../types';

type DecisionKind = 'course' | 'thesis' | 'general';
type DecisionStatus = 'approved' | 'rejected';

interface DecisionTarget {
  kind: DecisionKind;
  id: string;
  studentName: string;
  title: string;
}

function studentNameOf(value: unknown): string {
  if (!value || typeof value !== 'object') return '—';
  const obj = value as { user?: { name?: string } | null; rollNumber?: string };
  return obj.user?.name || obj.rollNumber || '—';
}

export function Approvals(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(supervisorApi.getPendingApprovals);

  const [decision, setDecision] = useState<DecisionTarget | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>('approved');
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const openDecision = (target: DecisionTarget, status: DecisionStatus) => {
    setDecision(target);
    setDecisionStatus(status);
    setComment('');
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !decision) return;
    setSubmitting(true);
    setFormError(null);
    const payload = { status: decisionStatus, comment: comment.trim() || undefined };
    try {
      if (decision.kind === 'course') await supervisorApi.approveCourse(decision.id, payload);
      else if (decision.kind === 'thesis') await supervisorApi.approveThesis(decision.id, payload);
      else await supervisorApi.approveRequest(decision.id, payload);
      setDecision(null);
      setSubmitting(false);
      setSuccessMessage(`Request ${decisionStatus.toLowerCase()} successfully.`);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to process the request. Please try again.');
    }
  };

  const isEmpty = data && data.courseApprovals.length === 0 && data.thesisApprovals.length === 0 && data.generalApprovals.length === 0;

  return (
    <>
      <PageHeader title="Approvals" description="Course, thesis, and general requests pending review." />
      {loading && <SkeletonTable rows={6} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="space-y-6">
          {successMessage && (
            <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}
          {isEmpty ? (
            <Card>
              <EmptyState title="No pending approvals" message="Everything is up to date." />
            </Card>
          ) : (
            <>
              <Card title={`Course Approvals (${data.courseApprovals.length})`} padded={false}>
                <Table
                  columns={[
                    { key: 'student', header: 'Student' },
                    { key: 'course', header: 'Course' },
                    { key: 'code', header: 'Code' },
                    { key: 'submitted', header: 'Submitted' },
                    { key: 'actions', header: 'Actions' },
                  ]}
                >
                  {data.courseApprovals.length === 0 ? (
                    <TableEmpty colSpan={5} message="No pending course approvals." />
                  ) : (
                    data.courseApprovals.map((item) => {
                      const course = typeof item.course === 'object' ? item.course : null;
                      const courseRow = item as StudentCourse;
                      return (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium text-gray-900">{studentNameOf(courseRow.student)}</TableCell>
                          <TableCell className="text-gray-700">{course?.courseName ?? '—'}</TableCell>
                          <TableCell className="text-gray-700">{course?.courseCode ?? '—'}</TableCell>
                          <TableCell className="text-gray-500">{formatDate((item as StudentCourse).approvedAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => openDecision({ kind: 'course', id: item._id, studentName: studentNameOf(courseRow.student), title: course?.courseName ?? 'Course request' }, 'approved')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => openDecision({ kind: 'course', id: item._id, studentName: studentNameOf(courseRow.student), title: course?.courseName ?? 'Course request' }, 'rejected')}>
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </Table>
              </Card>

              <Card title={`Thesis Approvals (${data.thesisApprovals.length})`} padded={false}>
                <Table
                  columns={[
                    { key: 'student', header: 'Student' },
                    { key: 'title', header: 'Thesis' },
                    { key: 'status', header: 'Status' },
                    { key: 'submitted', header: 'Submitted' },
                    { key: 'actions', header: 'Actions' },
                  ]}
                >
                  {data.thesisApprovals.length === 0 ? (
                    <TableEmpty colSpan={5} message="No pending thesis approvals." />
                  ) : (
                    data.thesisApprovals.map((item) => {
                      const thesisRow = item as Thesis;
                      return (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium text-gray-900">{studentNameOf(thesisRow.student)}</TableCell>
                          <TableCell className="text-gray-700">{thesisRow.title}</TableCell>
                          <TableCell>
                            <Badge label={THESIS_STATUS_LABELS[thesisRow.status]} className={THESIS_STATUS_STYLE[thesisRow.status]} />
                          </TableCell>
                          <TableCell className="text-gray-500">{formatDate(thesisRow.submissionDate)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => openDecision({ kind: 'thesis', id: item._id, studentName: studentNameOf(thesisRow.student), title: thesisRow.title }, 'approved')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => openDecision({ kind: 'thesis', id: item._id, studentName: studentNameOf(thesisRow.student), title: thesisRow.title }, 'rejected')}>
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </Table>
              </Card>

              <Card title={`General Approvals (${data.generalApprovals.length})`} padded={false}>
                <Table
                  columns={[
                    { key: 'student', header: 'Student' },
                    { key: 'type', header: 'Type' },
                    { key: 'submitted', header: 'Submitted' },
                    { key: 'actions', header: 'Actions' },
                  ]}
                >
                  {data.generalApprovals.length === 0 ? (
                    <TableEmpty colSpan={4} message="No pending general approvals." />
                  ) : (
                    data.generalApprovals.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium text-gray-900">{studentNameOf(item.requester)}</TableCell>
                        <TableCell className="text-gray-700">{item.type}</TableCell>
                        <TableCell className="text-gray-500">{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => openDecision({ kind: 'general', id: item._id, studentName: studentNameOf(item.requester), title: item.type }, 'approved')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openDecision({ kind: 'general', id: item._id, studentName: studentNameOf(item.requester), title: item.type }, 'rejected')}>
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </Table>
              </Card>
            </>
          )}
        </div>
      )}

      <Modal open={decision !== null} onClose={() => setDecision(null)} title={decision ? `${decisionStatus === 'approved' ? 'Approve' : 'Reject'} request` : undefined}>
        {decision && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && <Alert variant="error">{formError}</Alert>}
            <div>
              <p className="text-sm font-medium text-gray-900">{decision.title}</p>
              <p className="mt-1 text-xs text-gray-500">Requested by {decision.studentName}</p>
            </div>
            <Input
              id="approval-comment"
              label="Comment (optional)"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Reason for this decision"
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDecision(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : decisionStatus === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default Approvals;