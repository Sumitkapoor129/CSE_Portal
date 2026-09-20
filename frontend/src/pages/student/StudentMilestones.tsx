import { useMemo, useRef, useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { StatCard } from '../../components/shared/StatCard';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton, SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { daysUntil, formatDate, isValidDateString, todayLocal } from '../../utils/formatDate';
import {
  COMPREHENSIVE_RESULT_LABELS,
  COMPREHENSIVE_RESULT_STYLE,
  INTERNSHIP_STATUS_LABELS,
  INTERNSHIP_STATUS_STYLE,
  MILESTONE_DISPLAY_LABELS,
  MILESTONE_DISPLAY_STYLE,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLE,
} from '../../utils/constants';
import type {
  ComprehensiveExam,
  Internship,
  Milestone,
  MilestoneTimelineView as MilestoneTimelineData,
  RegistrationValidity,
} from '../../types';

type MilestoneTab = 'overview' | 'internships' | 'comprehensive';

export function StudentMilestones(): JSX.Element {
  const { user } = useAuth();
  const [active, setActive] = useState<MilestoneTab>('overview');

  const {
    data: timeline,
    loading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useApi(studentApi.getMilestoneTimeline);

  // Internships and comprehensive exams are fetched lazily on first tab
  // activation (ref flags per tab) instead of on mount.
  const fetchedInterns = useRef(false);
  const fetchedExams = useRef(false);
  const [internsEnabled, setInternsEnabled] = useState(false);
  const [examsEnabled, setExamsEnabled] = useState(false);

  const {
    data: internships,
    loading: internshipsLoading,
    error: internshipsError,
    refetch: refetchInternships,
  } = useApi(
    (opts) =>
      internsEnabled
        ? studentApi.getMyInternships(opts)
        : new Promise<Internship[]>(() => undefined),
    [internsEnabled]
  );

  const {
    data: exams,
    loading: examsLoading,
    error: examsError,
    refetch: refetchExams,
  } = useApi(
    (opts) =>
      examsEnabled
        ? studentApi.getMyComprehensiveExams(opts)
        : new Promise<ComprehensiveExam[]>(() => undefined),
    [examsEnabled]
  );

  const handleTabChange = (key: string) => {
    const next = key as MilestoneTab;
    if (next === 'internships' && !fetchedInterns.current) {
      fetchedInterns.current = true;
      setInternsEnabled(true);
    }
    if (next === 'comprehensive' && !fetchedExams.current) {
      fetchedExams.current = true;
      setExamsEnabled(true);
    }
    setActive(next);
  };

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const isTopicRegistered = Boolean(
    timeline?.milestones?.some((m) => m.key === 'topic_registration' && m.status === 'completed')
  );

  return (
    <>
      <PageHeader
        title="PhD Milestones"
        description="Track your academic milestones, deadlines and upcoming requirements."
      />
      <Tabs
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'internships', label: 'Internships & Research Leave' },
          { key: 'comprehensive', label: 'Comprehensive Exam' },
        ]}
        active={active}
        onChange={handleTabChange}
      />

      <div
        role="tabpanel"
        id={`tabpanel-${active}`}
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
        className="mt-6 focus:outline-none"
      >
        {active === 'overview' && (
          <>
            {timelineLoading && (
              <div className="space-y-6">
                <SkeletonCards count={4} />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            )}
            {timelineError && !timelineLoading && (
              <QueryError error={timelineError} onRetry={refetchTimeline} />
            )}
            {!timelineLoading && !timelineError && timeline && (
              <MilestoneOverview view={timeline} onRefetch={refetchTimeline} />
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

function MilestoneOverview({
  view,
  onRefetch,
}: {
  view: MilestoneTimelineData;
  onRefetch: () => void;
}): JSX.Element {
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Milestone | null>(null);
  const [dateTarget, setDateTarget] = useState<Milestone | null>(null);

  const needsSetup = view.admissionDate == null || view.milestones.length === 0;

  if (needsSetup) {
    return (
      <Card padded={false}>
        <EmptyState
          title="Set up your PhD timeline"
          message="Enter your first registration date to automatically calculate your academic milestones."
          action={<ButtonLink to="/student/profile">Go to Profile</ButtonLink>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ProgressOverview view={view} />
      <ValidityStrip validity={view.validity} />
      <NextMilestoneCard
        milestone={view.nextMilestone}
        onView={() => {
          if (view.nextMilestone) setSelected(view.nextMilestone);
        }}
      />
      <UpcomingSection milestones={view.upcoming} onSelect={setSelected} />
      <MilestoneTimelineSection milestones={view.milestones} onSelect={setSelected} />

      <MilestoneDetailModal
        milestone={selected}
        onClose={() => setSelected(null)}
        onComplete={(m) => {
          setSelected(null);
          setCompleteTarget(m);
        }}
        onSetDate={(m) => {
          setSelected(null);
          setDateTarget(m);
        }}
      />
      <CompleteMilestoneModal
        key={`complete-${completeTarget?._id ?? 'none'}`}
        milestone={completeTarget}
        admissionDate={view.admissionDate}
        onClose={() => setCompleteTarget(null)}
        onSaved={() => {
          setCompleteTarget(null);
          onRefetch();
        }}
      />
      <SetMilestoneDateModal
        key={`date-${dateTarget?._id ?? 'none'}`}
        milestone={dateTarget}
        admissionDate={view.admissionDate}
        onClose={() => setDateTarget(null)}
        onSaved={() => {
          setDateTarget(null);
          onRefetch();
        }}
      />
    </div>
  );
}

function ProgressOverview({ view }: { view: MilestoneTimelineData }): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Current Stage"
        value={<span className="block max-w-full truncate">{view.summary.currentStage ?? '—'}</span>}
        sub="current milestone stage"
      />
      <StatCard
        label="Completed Milestones"
        value={
          <>
            {view.summary.completed}{' '}
            <span className="text-sm font-normal text-gray-500">/ {view.summary.total}</span>
          </>
        }
        sub="stages completed"
      />
      <StatCard
        label="Upcoming Milestones"
        value={view.summary.upcoming}
        sub="in the pipeline"
      />
      <StatCard
        label="Overdue Milestones"
        value={
          <span className={view.summary.overdue > 0 ? 'text-red-600' : undefined}>
            {view.summary.overdue}
          </span>
        }
        sub="need attention"
      />
    </div>
  );
}

function ValidityStrip({ validity }: { validity: RegistrationValidity | null }): JSX.Element | null {
  if (!validity || validity.status === 'valid') return null;
  const { status, daysRemaining, admissionDate, expiryDate } = validity;
  const isExpired = status === 'expired';
  const badgeLabel = isExpired
    ? 'Expired (Exceeded 8 Years)'
    : `Expiring Soon (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left)`;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3 text-xs ${
        isExpired ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${isExpired ? 'text-red-900' : 'text-amber-900'}`}>
          PhD Registration Validity:
        </span>
        <span className={`rounded px-2 py-0.5 font-medium ${isExpired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
          {badgeLabel}
        </span>
      </div>
      <Link to="/student/profile" className="font-medium text-blue-600 transition-colors hover:text-blue-700">
        Enrolled {formatDate(admissionDate)} · Expiry {formatDate(expiryDate)} · View profile →
      </Link>
    </div>
  );
}

function NextMilestoneCard({
  milestone,
  onView,
}: {
  milestone: Milestone | null;
  onView: () => void;
}): JSX.Element {
  if (!milestone) {
    return (
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next milestone</p>
        <p className="mt-2 text-sm text-gray-500">All milestones completed. Congratulations!</p>
      </Card>
    );
  }
  const days = milestone.daysRemaining ?? daysUntil(milestone.dueDate);
  return (
    <Card className="border-l-4 border-l-blue-600">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next Milestone</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{milestone.title}</p>
          <p className="mt-1 text-xs text-gray-500">{milestone.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-gray-600">
              {milestone.dueDate ? `Target date: ${formatDate(milestone.dueDate)}` : 'Target date: To be determined'}
            </span>
            {days !== null && (
              <span className="text-xs text-gray-600">{milestone.urgencyText ?? `${days} days remaining`}</span>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onView}>
          View details
        </Button>
      </div>
    </Card>
  );
}

function UpcomingSection({
  milestones,
  onSelect,
}: {
  milestones: Milestone[];
  onSelect: (milestone: Milestone) => void;
}): JSX.Element {
  return (
    <Card title="Upcoming Milestones" padded={false}>
      {milestones.length === 0 ? (
        <EmptyState title="No upcoming milestones" message="You are all caught up for now." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {milestones.map((milestone) => {
            const accent =
              milestone.displayStatus === 'overdue'
                ? 'border-l-red-400 bg-red-50/40'
                : milestone.displayStatus === 'urgent'
                  ? 'border-l-red-400 bg-red-50/40'
                  : milestone.displayStatus === 'due_soon'
                    ? 'border-l-amber-400 bg-amber-50/40'
                    : 'border-l-transparent';
            return (
              <li
                key={milestone._id}
                className={`flex flex-col gap-3 border-l-2 px-6 py-4 sm:flex-row sm:items-center ${accent}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{milestone.description}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {milestone.dueDate ? `Target: ${formatDate(milestone.dueDate)}` : 'Target date: TBD'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {milestone.urgencyText && <span className="text-xs text-gray-500">{milestone.urgencyText}</span>}
                  <Badge
                    label={
                      milestone.displayStatus
                        ? MILESTONE_DISPLAY_LABELS[milestone.displayStatus]
                        : MILESTONE_STATUS_LABELS[milestone.status]
                    }
                    className={
                      milestone.displayStatus
                        ? MILESTONE_DISPLAY_STYLE[milestone.displayStatus]
                        : MILESTONE_STATUS_STYLE[milestone.status]
                    }
                  />
                  <Button variant="secondary" size="sm" onClick={() => onSelect(milestone)}>
                    View
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function MilestoneTimelineSection({
  milestones,
  onSelect,
}: {
  milestones: Milestone[];
  onSelect: (milestone: Milestone) => void;
}): JSX.Element {
  const sorted = useMemo(() => [...milestones].sort((a, b) => a.order - b.order), [milestones]);
  return (
    <Card title="Milestone Timeline">
      <ol className="mt-4 border-l border-gray-200">
        {sorted.map((milestone) => (
          <TimelineRow key={milestone._id} milestone={milestone} onSelect={onSelect} />
        ))}
      </ol>
    </Card>
  );
}

function TimelineRow({
  milestone,
  onSelect,
}: {
  milestone: Milestone;
  onSelect: (milestone: Milestone) => void;
}): JSX.Element {
  const isCompleted = milestone.status === 'completed';
  const dotClass = isCompleted
    ? 'border-transparent bg-green-500 text-white'
    : milestone.displayStatus === 'overdue'
      ? 'border-transparent bg-red-500 text-white'
      : milestone.displayStatus === 'urgent'
        ? 'border-transparent bg-red-500 text-white'
        : milestone.displayStatus === 'due_soon'
          ? 'border-transparent bg-amber-500 text-white'
          : milestone.displayStatus === 'upcoming'
            ? 'border-transparent bg-blue-500 text-white'
            : 'border-gray-300 bg-white text-gray-500';

  return (
    <li className="relative pb-6 pl-6 last:pb-0">
      <span
        aria-hidden="true"
        className={`absolute -left-2 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${dotClass}`}
      >
        {isCompleted ? (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="text-[10px] font-semibold leading-none">{milestone.order}</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => onSelect(milestone)}
        className="flex w-full flex-col gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-gray-50 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
            {milestone.title}
          </div>
          <div className="mt-0.5 text-xs text-gray-500">{milestone.description}</div>
          <div className="mt-1 text-xs text-gray-500">
            {isCompleted ? (
              milestone.completedAt ? (
                <span className="font-medium text-green-700">Completed {formatDate(milestone.completedAt)}</span>
              ) : (
                'Completed'
              )
            ) : milestone.dueDate ? (
              `Due ${formatDate(milestone.dueDate)}`
            ) : (
              'Due date TBD'
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
          {milestone.urgencyText && <span className="text-xs text-gray-500">{milestone.urgencyText}</span>}
          <Badge
            label={
              milestone.displayStatus
                ? MILESTONE_DISPLAY_LABELS[milestone.displayStatus]
                : MILESTONE_STATUS_LABELS[milestone.status]
            }
            className={
              milestone.displayStatus
                ? MILESTONE_DISPLAY_STYLE[milestone.displayStatus]
                : MILESTONE_STATUS_STYLE[milestone.status]
            }
          />
        </div>
      </button>
    </li>
  );
}

function MilestoneDetailModal({
  milestone,
  onClose,
  onComplete,
  onSetDate,
}: {
  milestone: Milestone | null;
  onClose: () => void;
  onComplete: (milestone: Milestone) => void;
  onSetDate: (milestone: Milestone) => void;
}): JSX.Element {
  if (!milestone) return <></>;
  const isCompleted = milestone.status === 'completed';
  const urgencyColor =
    milestone.displayStatus === 'overdue' || milestone.displayStatus === 'urgent'
      ? 'text-red-700'
      : milestone.displayStatus === 'due_soon'
        ? 'text-amber-700'
        : 'text-gray-500';
  const actionText = isCompleted
    ? `Milestone completed on ${milestone.completedAt ? formatDate(milestone.completedAt) : 'the recorded date'}.`
    : milestone.dueDate
      ? `Complete this milestone by ${formatDate(milestone.dueDate)}.`
      : 'This milestone has no regulation-defined date; record an actual date when it occurs.';

  return (
    <Modal open onClose={onClose} title={milestone.title} maxWidth="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            label={
              milestone.displayStatus
                ? MILESTONE_DISPLAY_LABELS[milestone.displayStatus]
                : MILESTONE_STATUS_LABELS[milestone.status]
            }
            className={
              milestone.displayStatus
                ? MILESTONE_DISPLAY_STYLE[milestone.displayStatus]
                : MILESTONE_STATUS_STYLE[milestone.status]
            }
          />
          {milestone.dateSource && (
            <Badge
              label={milestone.dateSource === 'auto' ? 'Auto-calculated' : 'Manually set'}
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600"
            />
          )}
        </div>

        {milestone.regulation && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Regulation</p>
            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {milestone.regulation}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</p>
          <p className="mt-1 text-sm text-gray-700">{milestone.description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Target date</p>
            <p className="mt-1 text-sm text-gray-900">
              {milestone.dueDate ? formatDate(milestone.dueDate) : 'To be determined'}
              {milestone.dueDate && milestone.dateSource && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({milestone.dateSource === 'auto' ? 'auto-calculated' : 'manually set'})
                </span>
              )}
            </p>
            {milestone.urgencyText && <p className={`mt-1 text-xs font-medium ${urgencyColor}`}>{milestone.urgencyText}</p>}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
            <p className="mt-1 text-sm text-gray-900">
              {milestone.displayStatus
                ? MILESTONE_DISPLAY_LABELS[milestone.displayStatus]
                : MILESTONE_STATUS_LABELS[milestone.status]}
            </p>
          </div>
        </div>

        {isCompleted && milestone.completedAt && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Completed on</p>
            <p className="mt-1 text-sm text-green-700">{formatDate(milestone.completedAt)}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Required action</p>
          <p className="mt-1 text-sm text-gray-700">{actionText}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
          {!isCompleted && (
            <Button onClick={() => onComplete(milestone)}>Mark as completed</Button>
          )}
          {(milestone.dateSource !== 'auto' || milestone.dueDate == null) && (
            <Button variant="secondary" onClick={() => onSetDate(milestone)}>
              Set target date
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CompleteMilestoneModal({
  milestone,
  admissionDate,
  onClose,
  onSaved,
}: {
  milestone: Milestone | null;
  admissionDate?: string | null;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [date, setDate] = useState(() => todayLocal());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!milestone) return <></>;

  const handleSubmit = async () => {
    if (submitting) return;
    if (!date) {
      setError('Completion date is required.');
      return;
    }
    if (!isValidDateString(date)) {
      setError('Please enter a valid date.');
      return;
    }
    const today = todayLocal();
    if (date > today) {
      setError('Completion date cannot be in the future.');
      return;
    }
    if (admissionDate && new Date(date) < new Date(admissionDate)) {
      setError('Completion date cannot be before your admission date.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await studentApi.completeMilestone(milestone._id, { completedDate: date });
      onSaved();
    } catch (err: unknown) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to complete this milestone. Please try again.');
    }
  };

  return (
    <Modal open onClose={onClose} title="Mark Milestone Completed" maxWidth="sm">
      <p className="text-sm text-gray-700">
        Mark <span className="font-medium text-gray-900">{milestone.title}</span> as completed?
      </p>
      <div className="mt-4">
        <Input
          id="milestone-completed-date"
          type="date"
          label="Completion Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={error ?? undefined}
          required
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Confirm'}
        </Button>
      </div>
    </Modal>
  );
}

function SetMilestoneDateModal({
  milestone,
  admissionDate,
  onClose,
  onSaved,
}: {
  milestone: Milestone | null;
  admissionDate?: string | null;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [date, setDate] = useState<string>(milestone?.dueDate ? formatDate(milestone.dueDate) : '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!milestone) return <></>;

  const handleSubmit = async () => {
    if (submitting) return;
    if (date && !isValidDateString(date)) {
      setError('Please enter a valid date.');
      return;
    }
    if (date && admissionDate && isValidDateString(admissionDate)) {
      const target = new Date(date);
      const admission = new Date(admissionDate);
      if (target < admission) {
        setError('Target date cannot be earlier than your admission date.');
        return;
      }
      const maxDate = new Date(admission);
      maxDate.setFullYear(admission.getFullYear() + 9);
      if (target > maxDate) {
        setError('Target date cannot be more than 9 years after your admission date.');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await studentApi.updateMilestoneDate(milestone._id, { dueDate: date || null });
      onSaved();
    } catch (err: unknown) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to update the target date. Please try again.');
    }
  };

  return (
    <Modal open onClose={onClose} title="Set Target Date" maxWidth="sm">
      <p className="text-sm text-gray-700">
        Set a target date for <span className="font-medium text-gray-900">{milestone.title}</span>. Leave empty to
        mark the date as TBD.
      </p>
      <div className="mt-4">
        <Input
          id="milestone-target-date"
          type="date"
          label="Target Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          hint="Leave empty if the date is not yet determined."
          error={error ?? undefined}
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save date'}
        </Button>
      </div>
    </Modal>
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