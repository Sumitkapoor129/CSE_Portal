import { useState, useMemo } from 'react';
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
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { formatDate } from '../../utils/formatDate';
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_STYLE,
  COMPREHENSIVE_RESULT_LABELS,
  COMPREHENSIVE_RESULT_STYLE,
  INTERNSHIP_STATUS_LABELS,
  INTERNSHIP_STATUS_STYLE,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLE,
} from '../../utils/constants';
import type { ComprehensiveExam, Internship, Milestone, TimelineItem } from '../../types';

type MilestoneTab = 'milestones' | 'timeline' | 'internships' | 'comprehensive';

export function StudentMilestones(): JSX.Element {
  const { user } = useAuth();
  const [active, setActive] = useState<MilestoneTab>('milestones');

  const {
    data: milestones,
    loading: milestonesLoading,
    error: milestonesError,
    refetch: refetchMilestones,
  } = useApi(studentApi.getMilestones);

  const {
    data: timeline,
    loading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useApi(studentApi.getTimeline);

  const {
    data: internships,
    loading: internshipsLoading,
    error: internshipsError,
    refetch: refetchInternships,
  } = useApi(studentApi.getMyInternships);

  const {
    data: exams,
    loading: examsLoading,
    error: examsError,
    refetch: refetchExams,
  } = useApi(studentApi.getMyComprehensiveExams);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const isTopicRegistered = Boolean(
    milestones?.some((m) => m.key === 'topic_registration' && m.status === 'completed')
  );

  return (
    <>
      <PageHeader
        title="Milestones"
        description="Track PhD milestones, coursework timeline, comprehensive exam, and internship leaves."
      />
      <Tabs
        tabs={[
          { key: 'milestones', label: 'Milestone Checklist' },
          { key: 'timeline', label: 'Degree Timeline' },
          { key: 'internships', label: 'Internships & Research Leave' },
          { key: 'comprehensive', label: 'Comprehensive Exam' },
        ]}
        active={active}
        onChange={(key) => setActive(key as MilestoneTab)}
      />

      <div
        role="tabpanel"
        id={`tabpanel-${active}`}
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
        className="mt-6 focus:outline-none"
      >
        {active === 'milestones' && (
          <>
            {milestonesLoading && <SkeletonCards count={3} />}
            {milestonesError && !milestonesLoading && (
              <QueryError error={milestonesError} onRetry={refetchMilestones} />
            )}
            {!milestonesLoading && !milestonesError && (
              <MilestoneChecklist milestones={milestones ?? []} />
            )}
          </>
        )}

        {active === 'timeline' && (
          <>
            {timelineLoading && <SkeletonCards count={3} />}
            {timelineError && !timelineLoading && (
              <QueryError error={timelineError} onRetry={refetchTimeline} />
            )}
            {!timelineLoading && !timelineError && (
              <DegreeTimeline timeline={timeline ?? []} />
            )}
          </>
        )}

        {active === 'internships' && (
          <>
            {internshipsLoading && <SkeletonTable rows={4} />}
            {internshipsError && !internshipsLoading && (
              <QueryError error={internshipsError} onRetry={refetchInternships} />
            )}
            {!internshipsLoading && !internshipsError && (
              <InternshipsSection
                internships={internships ?? []}
                isTopicRegistered={isTopicRegistered}
                onSuccess={refetchInternships}
              />
            )}
          </>
        )}

        {active === 'comprehensive' && (
          <>
            {examsLoading && <SkeletonTable rows={3} />}
            {examsError && !examsLoading && (
              <QueryError error={examsError} onRetry={refetchExams} />
            )}
            {!examsLoading && !examsError && (
              <ComprehensiveExamSection exams={exams ?? []} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function MilestoneChecklist({ milestones }: { milestones: Milestone[] }): JSX.Element {
  const sorted = useMemo(() => [...milestones].sort((a, b) => a.order - b.order), [milestones]);

  if (sorted.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState title="No milestones found" />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <ol className="divide-y divide-gray-100">
        {sorted.map((milestone) => {
          const isCompleted = milestone.status === 'completed';
          return (
            <li key={milestone._id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isCompleted ? '✓' : milestone.order}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
                <p className="text-xs text-gray-500">{milestone.description}</p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <Badge
                  label={MILESTONE_STATUS_LABELS[milestone.status]}
                  className={MILESTONE_STATUS_STYLE[milestone.status]}
                />
                {milestone.dueDate && <p className="text-xs text-gray-500">Due {formatDate(milestone.dueDate)}</p>}
                {milestone.completedAt && (
                  <p className="text-xs text-emerald-700 font-medium">Completed {formatDate(milestone.completedAt)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function DegreeTimeline({ timeline }: { timeline: TimelineItem[] }): JSX.Element {
  const visibleTimeline = useMemo(() => {
    return timeline.filter((item) => item.type !== 'course' || item.status !== 'rejected');
  }, [timeline]);

  if (visibleTimeline.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState title="No timeline entries yet" message="Add semesters to start your degree timeline." />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <ul className="divide-y divide-gray-100">
        {visibleTimeline.map((item, index) => (
          <li
            key={item.type === 'semester' ? `sem-${item.semesterNumber}` : `course-${item.courseCode}-${index}`}
            className={`px-6 py-4 ${item.type === 'semester' ? 'bg-gray-50/70 border-y border-gray-100' : 'pl-10'}`}
          >
            {item.type === 'semester' ? (
              <div>
                <p className="text-sm font-semibold text-gray-900">Semester {item.semesterNumber}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {item.academicYear}
                  {item.startDate ? ` · ${formatDate(item.startDate)} to ${formatDate(item.endDate)}` : ''}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.courseName}</p>
                  <p className="text-xs text-gray-500">{item.courseCode}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-gray-500">{item.credits} credits</span>
                  <Badge
                    label={APPROVAL_STATUS_LABELS[item.status ?? 'pending']}
                    className={APPROVAL_STATUS_STYLE[item.status ?? 'pending']}
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function InternshipsSection({
  internships,
  isTopicRegistered,
  onSuccess,
}: {
  internships: Internship[];
  isTopicRegistered: boolean;
  onSuccess: () => void;
}): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [organization, setOrganization] = useState('');
  const [researchTopic, setResearchTopic] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!organization.trim() || !researchTopic.trim() || !startDate || !endDate) {
      setFormError('All fields are required.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      setFormError('End date must be after start date.');
      return;
    }

    const durationMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (30 * 86400000)));
    if (durationMonths > 18) {
      setFormError('Internship duration cannot exceed 18 months per PhD ordinance.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await studentApi.createInternshipRequest({
        organization: organization.trim(),
        researchTopic: researchTopic.trim(),
        startDate,
        endDate,
      });
      setModalOpen(false);
      setOrganization('');
      setResearchTopic('');
      setStartDate('');
      setEndDate('');
      setSubmitting(false);
      onSuccess();
    } catch (err: unknown) {
      setSubmitting(false);
      setFormError(err instanceof Error ? err.message : 'Failed to submit internship request.');
    }
  };

  return (
    <div className="space-y-6">
      {!isTopicRegistered ? (
        <Alert variant="info">
          Per PhD Ordinance, students are eligible for internship / collaborative research only after successful Topic Registration.
        </Alert>
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setModalOpen(true)}>Request Internship / Leave</Button>
        </div>
      )}

      <Card title="Internship & Research Leave History" padded={false}>
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
          ]}
        >
          {internships.length === 0 ? (
            <TableEmpty colSpan={7} message="No internship or research leave requests on file." />
          ) : (
            internships.map((item) => (
              <TableRow key={item._id}>
                <TableCell className="font-medium text-gray-900">{item.organization}</TableCell>
                <TableCell className="text-gray-700">{item.researchTopic}</TableCell>
                <TableCell className="text-gray-700">{item.durationMonths} months</TableCell>
                <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(item.startDate)} – {formatDate(item.endDate)}
                </TableCell>
                <TableCell>
                  <Badge
                    label={INTERNSHIP_STATUS_LABELS[item.status]}
                    className={INTERNSHIP_STATUS_STYLE[item.status]}
                  />
                </TableCell>
                <TableCell className="text-xs text-gray-600">
                  {item.supervisorComment || '—'}
                </TableCell>
                <TableCell className="text-xs text-gray-600">
                  {item.adminComment || '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request Internship / Collaborative Research">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            id="org-name"
            label="Host Organization / University"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Max Planck Institute, Google Research, IISc"
            required
          />
          <Input
            id="res-topic"
            label="Research Topic / Objective"
            value={researchTopic}
            onChange={(e) => setResearchTopic(e.target.value)}
            placeholder="Brief description of research to be conducted"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="start-date"
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              id="end-date"
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            * Ordinance rule: Standard duration is up to 12 months; maximum 18 months case-by-case upon approval.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ComprehensiveExamSection({ exams }: { exams: ComprehensiveExam[] }): JSX.Element {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-sm font-semibold text-gray-900">PhD Ordinance Comprehensive Examination Guidelines</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-600">
          <li>The Comprehensive Examination is conducted following completion of all prescribed coursework.</li>
          <li>A student is permitted a maximum of <strong>two attempts</strong> to clear the examination.</li>
          <li>
            If the first attempt is unsatisfactory (failed), the re-examination must be held within{' '}
            <strong>3 months (90 days)</strong>.
          </li>
          <li>
            Upon clearing the exam, the scholar must register the thesis topic within <strong>6 months</strong>.
          </li>
        </ul>
      </Card>

      <Card title="Examination Attempts" padded={false}>
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
          {exams.length === 0 ? (
            <TableEmpty
              colSpan={6}
              message="No comprehensive examination attempts recorded yet. Ensure required coursework is completed."
            />
          ) : (
            exams.map((exam) => (
              <TableRow key={exam._id}>
                <TableCell className="font-semibold text-gray-900">Attempt {exam.attemptNumber}</TableCell>
                <TableCell className="text-gray-700">{formatDate(exam.examDate)}</TableCell>
                <TableCell>
                  <Badge
                    label={COMPREHENSIVE_RESULT_LABELS[exam.result]}
                    className={COMPREHENSIVE_RESULT_STYLE[exam.result]}
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
    </div>
  );
}

export default StudentMilestones;