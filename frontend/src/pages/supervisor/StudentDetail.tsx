import { useState, useMemo } from 'react';
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
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_STYLE,
  formatFaculty,
  INTERNSHIP_STATUS_LABELS,
  INTERNSHIP_STATUS_STYLE,
  SRC_ROLE_LABELS,
  STUDENT_TYPE_LABELS,
  THESIS_STATUS_LABELS,
  THESIS_STATUS_STYLE,
} from '../../utils/constants';
import type { ComprehensiveExamResult, Internship, Thesis } from '../../types';

type ThesisDecision = 'approved' | 'rejected' | 'resubmission_required';
type StudentDetailTab = 'profile' | 'academics' | 'documents' | 'thesis' | 'src' | 'ordinance';

export function StudentDetail(): JSX.Element {
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();

  const [active, setActive] = useState<StudentDetailTab>('profile');
  const [decisionThesis, setDecisionThesis] = useState<Thesis | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<ThesisDecision>('approved');
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ordinance module modal states
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examAttempt, setExamAttempt] = useState<1 | 2>(1);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [examResult, setExamResult] = useState<ComprehensiveExamResult>('passed');
  const [examRemarks, setExamRemarks] = useState('');
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // Internship decision modal states
  const [reviewingInternship, setReviewingInternship] = useState<Internship | null>(null);
  const [internshipDecision, setInternshipDecision] = useState<'supervisor_approved' | 'rejected'>('supervisor_approved');
  const [internshipComment, setInternshipComment] = useState('');
  const [internshipSubmitting, setInternshipSubmitting] = useState(false);
  const [internshipError, setInternshipError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (opts) => supervisorApi.getStudentDetail(studentId ?? '', opts),
    [studentId]
  );

  const {
    data: allScholarInternships,
    loading: internshipsLoading,
    refetch: refetchInternships,
  } = useApi(supervisorApi.listScholarInternships);

  const studentInternships = useMemo(() => {
    if (data?.internships && data.internships.length > 0) {
      return data.internships;
    }
    if (!allScholarInternships || !studentId) return [];
    return allScholarInternships.filter((item) => {
      const sId = typeof item.student === 'object' && item.student !== null ? item.student._id : item.student;
      return sId === studentId;
    });
  }, [data?.internships, allScholarInternships, studentId]);

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const openDecision = (thesis: Thesis, status: ThesisDecision) => {
    setDecisionThesis(thesis);
    setDecisionStatus(status);
    setComment('');
    setFormError(null);
    setSuccessMessage(null);
  };

  const closeDecision = () => {
    setDecisionThesis(null);
    setComment('');
    setFormError(null);
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
      closeDecision();
      setSubmitting(false);
      setSuccessMessage(`Thesis decision recorded (${THESIS_STATUS_LABELS[decisionStatus]}).`);
      refetch();
    } catch (err: unknown) {
      setSubmitting(false);
      setFormError(err instanceof Error ? err.message : 'Unable to record the decision. Please try again.');
    }
  };

  const handleRecordExam = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (examSubmitting || !studentId) return;

    setExamSubmitting(true);
    setExamError(null);
    try {
      await supervisorApi.recordComprehensiveExam({
        studentId,
        attemptNumber: examAttempt,
        examDate,
        result: examResult,
        remarks: examRemarks.trim() || undefined,
      });
      setExamModalOpen(false);
      setExamRemarks('');
      setExamSubmitting(false);
      setSuccessMessage(`Comprehensive examination result recorded successfully.`);
      refetch();
    } catch (err: unknown) {
      setExamSubmitting(false);
      setExamError(err instanceof Error ? err.message : 'Failed to record comprehensive exam result.');
    }
  };

  const handleReviewInternship = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (internshipSubmitting || !reviewingInternship) return;

    setInternshipSubmitting(true);
    setInternshipError(null);
    try {
      await supervisorApi.reviewInternship(reviewingInternship._id, {
        status: internshipDecision,
        supervisorComment: internshipComment.trim() || undefined,
      });
      setReviewingInternship(null);
      setInternshipComment('');
      setInternshipSubmitting(false);
      setSuccessMessage(`Internship review decision recorded.`);
      refetchInternships();
    } catch (err: unknown) {
      setInternshipSubmitting(false);
      setInternshipError(err instanceof Error ? err.message : 'Failed to review internship.');
    }
  };

  const decisionLabel = (status: ThesisDecision): string => {
    if (status === 'approved') return 'Approve thesis';
    if (status === 'rejected') return 'Reject thesis';
    return 'Request resubmission';
  };

  return (
    <>
      <PageHeader title="Student Detail" description="Review a scholar's academic record, milestones, and ordinance requirements." />
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
              { key: 'ordinance', label: 'Ordinance & Exams' },
            ]}
            active={active}
            onChange={(key) => setActive(key as StudentDetailTab)}
          />

          <div
            role="tabpanel"
            id={`tabpanel-${active}`}
            aria-labelledby={`tab-${active}`}
            tabIndex={0}
            className="focus:outline-none"
          >
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
                          ariaLabel={`Semester ${entry.semester.semesterNumber} Courses`}
                          columns={[
                            { key: 'code', header: 'Code' },
                            { key: 'name', header: 'Course' },
                            { key: 'credits', header: 'Credits' },
                            { key: 'status', header: 'Status' },
                          ]}
                        >
                          {entry.courses.map((studentCourse) => {
                            const course =
                              Boolean(studentCourse.course) && typeof studentCourse.course === 'object'
                                ? studentCourse.course
                                : null;
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
                    ariaLabel="Scholar Documents"
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
                            rel="noopener noreferrer"
                            aria-label={`Open ${document.documentName} in new tab`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Open <span className="sr-only">(opens in new tab)</span>
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
                    ariaLabel="Thesis Submissions"
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
                          <Badge
                            label={THESIS_STATUS_LABELS[thesis.status]}
                            className={THESIS_STATUS_STYLE[thesis.status]}
                          />
                        </TableCell>
                        <TableCell className="text-gray-500">{formatDate(thesis.submissionDate)}</TableCell>
                        <TableCell>
                          {(thesis.status === 'submitted' || thesis.status === 'under_review') && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => openDecision(thesis, 'approved')}
                                aria-label={`Approve thesis version ${thesis.version}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openDecision(thesis, 'rejected')}
                                aria-label={`Reject thesis version ${thesis.version}`}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openDecision(thesis, 'resubmission_required')}
                                aria-label={`Request resubmission for thesis version ${thesis.version}`}
                              >
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

            {active === 'ordinance' && (
              <div className="space-y-6">
                {/* Comprehensive Exam Section */}
                {(() => {
                  const existingExams = data.comprehensiveExams ?? [];
                  const attempt1 = existingExams.find((e) => e.attemptNumber === 1);
                  const attempt2 = existingExams.find((e) => e.attemptNumber === 2);
                  const isExamPassed = attempt1?.result === 'passed' || attempt2?.result === 'passed';
                  const canRecord2nd = Boolean(attempt1 && attempt1.result === 'failed' && !attempt2);
                  const canRecordExam = !isExamPassed && (!attempt1 || canRecord2nd);
                  const recordButtonLabel = canRecord2nd ? 'Record 2nd Attempt' : 'Record Exam Result';

                  return (
                    <Card
                      title="Comprehensive Examination"
                      padded={false}
                      actions={
                        canRecordExam ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setExamAttempt(canRecord2nd ? 2 : 1);
                              setExamModalOpen(true);
                              setExamError(null);
                            }}
                          >
                            {recordButtonLabel}
                          </Button>
                        ) : isExamPassed ? (
                          <Badge label="Examination Cleared" className="bg-green-50 text-green-700 border-green-200" />
                        ) : (
                          <Badge label="Max 2 Attempts Recorded" className="bg-red-50 text-red-700 border-red-200" />
                        )
                      }
                    >
                      <div className="border-b border-gray-100 bg-gray-50/50 p-4">
                        <p className="text-xs text-gray-700">
                          <strong>PhD Ordinance Guidelines:</strong> Coursework completion required before exam; maximum 2 attempts permitted.
                          If Attempt 1 fails, re-examination must be held within 3 months (90 days).
                        </p>
                      </div>
                      <Table
                        ariaLabel="Comprehensive Exam Attempts"
                        columns={[
                          { key: 'attempt', header: 'Attempt #' },
                          { key: 'date', header: 'Exam Date' },
                          { key: 'result', header: 'Result' },
                          { key: 'retake', header: 'Retake Deadline' },
                          { key: 'conducted', header: 'Conducted By' },
                          { key: 'remarks', header: 'Remarks' },
                        ]}
                      >
                        {existingExams.length === 0 ? (
                          <TableEmpty colSpan={6} message="No comprehensive exam attempts recorded yet for this scholar." />
                        ) : (
                          existingExams.map((exam) => (
                            <TableRow key={exam._id}>
                              <TableCell className="font-semibold text-gray-900">Attempt {exam.attemptNumber}</TableCell>
                              <TableCell className="text-gray-700">{formatDate(exam.examDate)}</TableCell>
                              <TableCell>
                                <Badge
                                  label={EXAM_RESULT_LABELS[exam.result]}
                                  className={EXAM_RESULT_STYLE[exam.result]}
                                />
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {exam.retakeDeadline ? (
                                  <span className="font-medium text-red-700">Due by {formatDate(exam.retakeDeadline)}</span>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">{exam.conductedBy?.name ?? 'Supervisor Panel'}</TableCell>
                              <TableCell className="text-xs text-gray-600">{exam.remarks || '—'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </Table>
                    </Card>
                  );
                })()}

                {/* Internships & Leave Review Section */}
                <Card title="Internships & Research Leave Requests" padded={false}>
                  {internshipsLoading ? (
                    <div className="p-4">
                      <SkeletonCards count={2} />
                    </div>
                  ) : (
                    <Table
                      ariaLabel="Scholar Internships"
                      columns={[
                        { key: 'org', header: 'Organization' },
                        { key: 'topic', header: 'Research Topic' },
                        { key: 'duration', header: 'Duration' },
                        { key: 'dates', header: 'Start / End Dates' },
                        { key: 'status', header: 'Status' },
                        { key: 'supervisorComment', header: 'Supervisor Comment' },
                        { key: 'adminComment', header: 'Admin Comment' },
                        { key: 'actions', header: 'Action' },
                      ]}
                    >
                      {studentInternships.length === 0 ? (
                        <TableEmpty colSpan={8} message="No internship or research leave requests from this scholar." />
                      ) : (
                        studentInternships.map((intern) => (
                          <TableRow key={intern._id}>
                            <TableCell className="font-medium text-gray-900">{intern.organization}</TableCell>
                            <TableCell className="text-gray-700">{intern.researchTopic}</TableCell>
                            <TableCell className="text-gray-700">{intern.durationMonths} months</TableCell>
                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDate(intern.startDate)} – {formatDate(intern.endDate)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                label={INTERNSHIP_STATUS_LABELS[intern.status]}
                                className={INTERNSHIP_STATUS_STYLE[intern.status]}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {intern.supervisorComment || '—'}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {intern.adminComment || '—'}
                            </TableCell>
                            <TableCell>
                              {intern.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setReviewingInternship(intern);
                                      setInternshipDecision('supervisor_approved');
                                      setInternshipComment('');
                                      setInternshipError(null);
                                    }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      setReviewingInternship(intern);
                                      setInternshipDecision('rejected');
                                      setInternshipComment('');
                                      setInternshipError(null);
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Processed</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </Table>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thesis Decision Modal */}
      <Modal
        open={decisionThesis !== null}
        onClose={closeDecision}
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
              <Button type="button" variant="secondary" onClick={closeDecision}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : decisionLabel(decisionStatus)}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Comprehensive Exam Result Modal */}
      <Modal
        open={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        title="Record Comprehensive Examination Result"
      >
        <form onSubmit={handleRecordExam} className="space-y-4" noValidate>
          {examError && <Alert variant="error">{examError}</Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exam-attempt" className="block text-xs font-medium text-gray-700">
                Attempt Number
              </label>
              <select
                id="exam-attempt"
                value={examAttempt}
                onChange={(e) => setExamAttempt(Number(e.target.value) as 1 | 2)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={1}>Attempt 1</option>
                <option value={2}>Attempt 2 (Re-examination)</option>
              </select>
            </div>
            <Input
              id="exam-date"
              type="date"
              label="Exam Date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="exam-result" className="block text-xs font-medium text-gray-700">
              Exam Result
            </label>
            <select
              id="exam-result"
              value={examResult}
              onChange={(e) => setExamResult(e.target.value as ComprehensiveExamResult)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="passed">Passed (Satisfactory)</option>
              <option value="failed">Failed (Unsatisfactory)</option>
              <option value="scheduled">Scheduled / Under Evaluation</option>
            </select>
          </div>

          <Input
            id="exam-remarks"
            label="Evaluation Remarks / Topic Feedback (optional)"
            value={examRemarks}
            onChange={(e) => setExamRemarks(e.target.value)}
            placeholder="Committee comments, performance feedback"
          />

          {examAttempt === 1 && examResult === 'failed' && (
            <p className="rounded bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
              <strong>Notice:</strong> Marking Attempt 1 as failed automatically records a 3-month (90 days) re-examination
              deadline per university ordinance rules.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setExamModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={examSubmitting}>
              {examSubmitting ? 'Saving…' : 'Record Result'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Internship Review Modal */}
      <Modal
        open={reviewingInternship !== null}
        onClose={() => setReviewingInternship(null)}
        title={
          reviewingInternship
            ? `${internshipDecision === 'supervisor_approved' ? 'Approve' : 'Reject'} Internship Request`
            : ''
        }
      >
        {reviewingInternship && (
          <form onSubmit={handleReviewInternship} className="space-y-4" noValidate>
            {internshipError && <Alert variant="error">{internshipError}</Alert>}
            <div className="rounded-md border border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-700">
              <p><strong>Host:</strong> {reviewingInternship.organization}</p>
              <p className="mt-1"><strong>Topic:</strong> {reviewingInternship.researchTopic}</p>
              <p className="mt-1"><strong>Duration:</strong> {reviewingInternship.durationMonths} months</p>
            </div>
            <Input
              id="intern-comment"
              label="Supervisor Comment (optional)"
              value={internshipComment}
              onChange={(e) => setInternshipComment(e.target.value)}
              placeholder="Notes, recommendations, or justification"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setReviewingInternship(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={internshipSubmitting}>
                {internshipSubmitting
                  ? 'Saving…'
                  : internshipDecision === 'supervisor_approved'
                  ? 'Approve Request'
                  : 'Reject Request'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default StudentDetail;