import { useState } from 'react';
import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { formatDate } from '../../utils/formatDate';
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_STYLE,
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUS_STYLE,
} from '../../utils/constants';
import type { Milestone, TimelineItem } from '../../types';

export function StudentMilestones(): JSX.Element {
  const { user } = useAuth();
  const { data: milestones, loading: milestonesLoading, error: milestonesError, refetch: refetchMilestones } =
    useApi(studentApi.getMilestones);
  const { data: timeline, loading: timelineLoading, error: timelineError, refetch: refetchTimeline } =
    useApi(studentApi.getTimeline);
  const [active, setActive] = useState('milestones');

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const loading = milestonesLoading || timelineLoading;
  const error = milestonesError || timelineError;

  const retryAll = () => {
    refetchMilestones();
    refetchTimeline();
  };

  return (
    <>
      <PageHeader title="Milestones" description="Track your PhD milestones and degree timeline." />
      <Tabs
        tabs={[
          { key: 'milestones', label: 'Milestone Checklist' },
          { key: 'timeline', label: 'Degree Timeline' },
        ]}
        active={active}
        onChange={setActive}
      />
      <div className="mt-6">
        {loading && <SkeletonCards count={3} />}
        {error && !loading && <QueryError error={error} onRetry={retryAll} />}
        {!loading && !error && active === 'milestones' && (
          <MilestoneChecklist milestones={milestones ?? []} />
        )}
        {!loading && !error && active === 'timeline' && <DegreeTimeline timeline={timeline ?? []} />}
      </div>
    </>
  );
}

function MilestoneChecklist({ milestones }: { milestones: Milestone[] }): JSX.Element {
  const sorted = [...milestones].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState title="No milestones found" />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <ul className="divide-y divide-gray-100">
        {sorted.map((milestone) => (
          <li key={milestone._id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700">
              {milestone.order}
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
                <p className="text-xs text-gray-500">Completed {formatDate(milestone.completedAt)}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DegreeTimeline({ timeline }: { timeline: TimelineItem[] }): JSX.Element {
  const visibleTimeline = timeline.filter(
    (item) => item.type !== 'course' || item.status !== 'rejected'
  );

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
          <li key={index} className="px-6 py-4">
            {item.type === 'semester' ? (
              <div>
                <p className="text-sm font-semibold text-gray-900">Semester {item.semesterNumber}</p>
                <p className="mt-1 text-sm text-gray-500">
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

export default StudentMilestones;