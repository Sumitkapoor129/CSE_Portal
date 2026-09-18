import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { supervisorApi } from '../../api/supervisor';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { DetailRow } from '../../components/shared/DetailRow';
import { Alert } from '../../components/ui/Alert';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableCell, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_STYLE,
  formatFaculty,
  SRC_ROLE_LABELS,
  STUDENT_TYPE_LABELS,
  THESIS_STATUS_LABELS,
  THESIS_STATUS_STYLE,
} from '../../utils/constants';
import type { Thesis } from '../../types';

type ThesisDecision = 'approved' | 'rejected' | 'resubmission_required';

export function StudentDetail(): JSX.Element {
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();

  const [active, setActive] = useState('profile');
  const [decisionThesis, setDecisionThesis] = useState<Thesis | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<ThesisDecision>('approved');
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (opts) => supervisorApi.getStudentDetail(studentId ?? '', opts),
    [studentId]
  );

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const openDecision = (thesis: Thesis, status: ThesisDecision) => {
    setDecisionThesis(thesis);
    setDecisionStatus(status);
    setComment('');
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleDecision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !decisionThesis) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await supervisorApi.approveThesis(decisionThesis._id, {
        status: decisionStatus,
        comment: comment.trim() || undefined,
      });
      setDecisionThesis(null);
      setSubmitting(false);
      setSuccessMessage(`Thesis decision recorded (${THESIS_STATUS_LABELS[decisionStatus]}).`);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to record the decision. Please try again.');
    }
  };

  const decisionLabel = (status: ThesisDecision): string => {
    if (status === 'approved') return 'Approve thesis';
    if (status === 'rejected') return 'Reject thesis';
    return 'Request resubmission';
  };

  return (
    <>
      <PageHeader title="Student Detail" description="Review a scholar's academic record." />
      {loading && (
        <div className="space-y-6">
          <SkeletonCards count={1} />
          <SkeletonTable rows={5} />
        </div>
      )}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="space-y-6">
          {successMessage && (
            <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={data.profile.user.name} photo={data.profile.profilePhoto ?? null} />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{data.profile.user.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {data.profile.rollNumber} · {data.profile.department}
                  </p>
                </div>
              </div>
              <Badge label={STUDENT_TYPE_LABELS[data.profile.studentType]} />
            </div>
          </Card>

          <Tabs
            tabs={[
              { key: 'profile', label: 'Profile' },
              { key: 'academics', label: 'Academics' },
              { key: 'documents', label: 'Documents' },
              { key: 'thesis', label: 'Thesis' },
              { key: 'src', label: 'SRC' },
            ]}
            active={active}
            onChange={(key) => setActive(key)}
          />

          {active === 'profile' && (
            <Card>
              <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <DetailRow label="College ID" value={data.profile.collegeId} />
                <DetailRow label="Department" value={data.profile.department} />
                <DetailRow label="Research Area" value={data.profile.researchArea || '—'} />
                <DetailRow label="Admission Date" value={formatDate(data.profile.admissionDate)} />
                <DetailRow label="Required Credits" value={data.profile.requiredCredits} />
                <DetailRow label="Supervisor" value={formatFaculty(data.profile.supervisor)} />
                <DetailRow label="Co-supervisor" value={formatFaculty(data.profile.coSupervisor)} />
              </dl>
            </Card>
          )}

          {active === 'academics' && (
            <div className="space-y-6">
              {data.timeline.length === 0 ? (
                <Card>
                  <EmptyState title="No academic records" message="This scholar has no semesters yet." />
                </Card>
              ) : (
                data.timeline.map((entry) => (
                  <Card key={entry.semester._id} title={`Semester ${entry.semester.semesterNumber}`} padded={false}>
                    <div className="px-6 py-4">
                      <p className="text-sm text-gray-500">{entry.semester.academicYear}</p>
                    </div>
                    {entry.courses.length === 0 ? (
                      <p className="px-6 pb-6 text-sm text-gray-500">No courses registered in this semester.</p>
                    ) : (
                      <Table
                        columns={[
                          { key: 'code', header: 'Code' },
                          { key: 'name', header: 'Course' },
                          { key: 'credits', header: 'Credits' },
                          { key: 'status', header: 'Status' },
                        ]}
                      >
                        {entry.courses.map((studentCourse) => {
                          const course = typeof studentCourse.course === 'object' ? studentCourse.course : null;
                          return (
                            <TableRow key={studentCourse._id}>
                              <TableCell className="font-medium text-gray-900">{course?.courseCode ?? '—'}</TableCell>
                              <TableCell className="text-gray-700">{course?.courseName ?? '—'}</TableCell>
                              <TableCell className="text-gray-700">{course?.credits ?? '—'}</TableCell>
                              <TableCell>
                                <Badge
                                  label={APPROVAL_STATUS_LABELS[studentCourse.status]}
                                  className={APPROVAL_STATUS_STYLE[studentCourse.status]}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Table>
                    )}
                    <div className="border-t border-gray-100 px-6 py-4">
                      {entry.credits ? (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium text-gray-900">{entry.credits.earnedCredits}</span> of{' '}
                          {entry.credits.requiredCredits} credits approved
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">No credits recorded for this semester.</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total credits</p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{data.totalCredits.earned}</span>
                    <span className="text-gray-500"> / {data.totalCredits.required}</span> earned
                  </p>
                </div>
              </Card>
            </div>
          )}

          {active === 'documents' && (
            <Card title="Documents" padded={false}>
              {data.documents.length === 0 ? (
                <EmptyState title="No documents" message="No documents uploaded by this scholar." />
              ) : (
                <Table
                  columns={[
                    { key: 'name', header: 'Document' },
                    { key: 'type', header: 'Type' },
                    { key: 'uploaded', header: 'Uploaded' },
                    { key: 'status', header: 'Status' },
                    { key: 'link', header: 'Open' },
                  ]}
                >
                  {data.documents.map((document) => (
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
                      <TableCell className="text-right">
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Open
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}
            </Card>
          )}

          {active === 'thesis' && (
            <Card title="Thesis" padded={false}>
              {data.theses.length === 0 ? (
                <EmptyState title="No thesis" message="This scholar has not submitted any thesis versions." />
              ) : (
                <Table
                  columns={[
                    { key: 'version', header: 'Version' },
                    { key: 'title', header: 'Title' },
                    { key: 'status', header: 'Status' },
                    { key: 'submitted', header: 'Submitted' },
                    { key: 'actions', header: 'Actions' },
                  ]}
                >
                  {data.theses.map((thesis) => (
                    <TableRow key={thesis._id}>
                      <TableCell className="font-medium text-gray-900">{thesis.version}</TableCell>
                      <TableCell className="text-gray-700">{thesis.title}</TableCell>
                      <TableCell>
                        <Badge label={THESIS_STATUS_LABELS[thesis.status]} className={THESIS_STATUS_STYLE[thesis.status]} />
                      </TableCell>
                      <TableCell className="text-gray-500">{formatDate(thesis.submissionDate)}</TableCell>
                      <TableCell>
                        {(thesis.status === 'submitted' || thesis.status === 'under_review') && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => openDecision(thesis, 'approved')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openDecision(thesis, 'rejected')}>
                              Reject
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openDecision(thesis, 'resubmission_required')}>
                              Request Resubmission
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}
            </Card>
          )}

          {active === 'src' && (
            <Card title="SRC Committee" padded={false}>
              {!data.srcCommittee || data.srcCommittee.members.length === 0 ? (
                <EmptyState title="No SRC committee" message="No SRC committee assigned to this scholar." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.srcCommittee.members.map((member, index) => (
                    <li key={index} className="flex items-center justify-between gap-4 px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">{formatFaculty(member.faculty)}</p>
                      <Badge label={SRC_ROLE_LABELS[member.role]} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}

      <Modal
        open={decisionThesis !== null}
        onClose={() => setDecisionThesis(null)}
        title={`${decisionThesis ? decisionLabel(decisionStatus) : ''}${decisionThesis ? ` — Version ${decisionThesis.version}` : ''}`}
      >
        {decisionThesis && (
          <form onSubmit={handleDecision} className="space-y-4" noValidate>
            {formError && <Alert variant="error">{formError}</Alert>}
            <div>
              <p className="text-sm font-medium text-gray-900">{decisionThesis.title}</p>
              <p className="mt-1 text-xs text-gray-500">Current status: {THESIS_STATUS_LABELS[decisionThesis.status]}</p>
            </div>
            <Input
              id="thesis-comment"
              label="Comment (optional)"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Reason for this decision"
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setDecisionThesis(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : decisionLabel(decisionStatus)}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default StudentDetail;