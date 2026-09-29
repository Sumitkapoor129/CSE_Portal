import { useMemo, useState } from 'react';
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
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import { EVENT_TYPE_LABELS } from '../../utils/constants';
import type { EventType, StudentOption } from '../../types';

interface EventFormState {
  title: string;
  eventType: EventType | '';
  customEventType: string;
  description: string;
  date: string;
  startTime: string;
  location: string;
  semester: string;
}

const EMPTY_FORM: EventFormState = {
  title: '',
  eventType: '',
  customEventType: '',
  description: '',
  date: '',
  startTime: '',
  location: '',
  semester: '',
};

export function formatScholarOptionLabel(scholar: StudentOption): string {
  const programType = scholar.program
    ? `${scholar.program.toUpperCase()}/${scholar.studentType.toUpperCase()}`
    : scholar.studentType.toUpperCase();
  return `${scholar.name} (${scholar.rollNumber} - ${programType})`;
}

export function getAvailableEventTypes(student: StudentOption): { value: EventType; label: string }[] {
  const milestones = student.completedMilestones ?? [];
  const options: { value: EventType; label: string }[] = [];

  options.push({ value: 'progress_seminar', label: EVENT_TYPE_LABELS.progress_seminar });

  if (!milestones.includes('comprehensive_exam')) {
    options.push({ value: 'comprehensive_exam', label: EVENT_TYPE_LABELS.comprehensive_exam });
  }

  if (!milestones.includes('topic_registration')) {
    options.push({ value: 'topic_registration', label: EVENT_TYPE_LABELS.topic_registration });
  }

  if (student.studentType?.toLowerCase() === 'frp' && !milestones.includes('enhancement_seminar')) {
    options.push({ value: 'enhancement_seminar', label: EVENT_TYPE_LABELS.enhancement_seminar });
  }

  if (!milestones.includes('pre_submission')) {
    options.push({ value: 'pre_submission', label: EVENT_TYPE_LABELS.pre_submission });
  }

  if (!milestones.includes('defense')) {
    options.push({ value: 'open_defence', label: EVENT_TYPE_LABELS.open_defence });
  }

  options.push({ value: 'other', label: EVENT_TYPE_LABELS.other });

  return options;
}

export function SupervisorEvents(): JSX.Element {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useApi(
    (opts) => supervisorApi.getEvents({ page, limit: 10 }, opts),
    [page]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const events = data?.events ?? [];
  const pagination = data?.pagination;

  const openModal = () => {
    setForm(EMPTY_FORM);
    setSelectedStudentId('');
    setFormError(null);
    setOptionsError(false);
    setModalOpen(true);

    if (options.length === 0) {
      setOptionsLoading(true);
      supervisorApi
        .getStudentOptions()
        .then((result) => {
          setOptions(result);
          setOptionsLoading(false);
        })
        .catch(() => {
          setOptionsError(true);
          setOptionsLoading(false);
        });
    }
  };

  const handleStudentChange = (studentUserId: string) => {
    setSelectedStudentId(studentUserId);
    setFormError(null);
    const student = options.find((s) => s.userId === studentUserId);
    if (!student) {
      setForm((prev) => ({ ...prev, eventType: '', customEventType: '' }));
      return;
    }
    const available = getAvailableEventTypes(student);
    if (!available.some((opt) => opt.value === form.eventType)) {
      setForm((prev) => ({ ...prev, eventType: '', customEventType: '' }));
    }
  };

  const handleEventTypeChange = (value: EventType | '') => {
    setForm((prev) => ({
      ...prev,
      eventType: value,
      customEventType: value === 'other' ? prev.customEventType : '',
    }));
  };

  const selectedStudent = useMemo(
    () => options.find((s) => s.userId === selectedStudentId),
    [options, selectedStudentId]
  );

  const studentSelectOptions = useMemo(
    () => [
      {
        value: '',
        label: optionsLoading
          ? 'Loading scholars…'
          : options.length === 0 && !optionsError
          ? 'No eligible scholars found'
          : 'Select a scholar…',
      },
      ...options.map((option) => ({
        value: option.userId,
        label: formatScholarOptionLabel(option),
      })),
    ],
    [options, optionsLoading, optionsError]
  );

  const eventTypeSelectOptions = useMemo(
    () =>
      selectedStudent
        ? [
            { value: '', label: 'Select event type…' },
            ...getAvailableEventTypes(selectedStudent),
          ]
        : [{ value: '', label: 'Select a scholar first to view event types' }],
    [selectedStudent]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (!selectedStudentId) {
      setFormError('Please select a scholar.');
      return;
    }
    if (!form.eventType) {
      setFormError('Please select an event type.');
      return;
    }
    if (form.eventType === 'other' && !form.customEventType.trim()) {
      setFormError('Please enter a custom event type.');
      return;
    }
    if (!form.title.trim() || !form.date || !form.startTime) {
      setFormError('Title, date, and start time are required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await supervisorApi.createEvent({
        title: form.title.trim(),
        eventType: form.eventType as EventType,
        customEventType: form.eventType === 'other' ? form.customEventType.trim() : undefined,
        description: form.description.trim() || undefined,
        date: form.date,
        startTime: form.startTime,
        location: form.location.trim() || undefined,
        participants: [selectedStudentId],
        semester: form.semester.trim() || undefined,
      });
      setModalOpen(false);
      setSubmitting(false);
      setSuccessMessage('Event created successfully.');
      setPage(1);
      refetch();
    } catch (err: unknown) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message;
      setFormError(message || 'Unable to create the event. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Events"
        description="Events you organize for your scholars."
        actions={
          <Button onClick={openModal}>Create Event</Button>
        }
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
        <Card title="Events" padded={false}>
          {events.length === 0 ? (
            <EmptyState title="No events scheduled" message="Create an event to invite your scholars." />
          ) : (
            <Table
              ariaLabel="Scheduled Events"
              columns={[
                { key: 'title', header: 'Title' },
                { key: 'type', header: 'Type' },
                { key: 'date', header: 'Date' },
                { key: 'location', header: 'Location' },
                { key: 'participants', header: 'Participants' },
              ]}
            >
              {events.map((event) => {
                const typeBadgeLabel =
                  event.eventType === 'other' && event.customEventType
                    ? `Others: ${event.customEventType}`
                    : EVENT_TYPE_LABELS[event.eventType] || event.eventType;

                return (
                  <TableRow key={event._id}>
                    <TableCell className="font-medium text-gray-900">{event.title}</TableCell>
                    <TableCell className="max-w-xs truncate" title={typeBadgeLabel}>
                      <Badge label={typeBadgeLabel} />
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(event.date)}
                      {event.startTime ? ` • ${event.startTime}` : ''}
                    </TableCell>
                    <TableCell className="text-gray-700">{event.location || '—'}</TableCell>
                    <TableCell className="text-gray-700">{event.participants?.length ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </Table>
          )}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4">
              <Pagination page={page} totalPages={pagination.totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Event" maxWidth="xl">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          {optionsError && (
            <Alert variant="warning">Unable to load eligible scholars. Please close and try again.</Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="event-student"
              label="Scholar"
              value={selectedStudentId}
              onChange={(event) => handleStudentChange(event.target.value)}
              options={studentSelectOptions}
              disabled={optionsLoading || options.length === 0}
            />
            <Select
              id="event-type"
              label="Event Type"
              value={form.eventType}
              onChange={(event) => handleEventTypeChange(event.target.value as EventType | '')}
              options={eventTypeSelectOptions}
              disabled={!selectedStudentId}
              hint={!selectedStudentId ? 'Please select a scholar first' : undefined}
            />
          </div>

          {form.eventType === 'other' && (
            <Input
              id="event-custom-type"
              label="Custom Event Type"
              value={form.customEventType}
              onChange={(event) => setForm((prev) => ({ ...prev, customEventType: event.target.value }))}
              placeholder="Enter event type"
              required
            />
          )}

          <Input
            id="event-title"
            label="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Event title"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="event-date"
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
            <Input
              id="event-start"
              label="Start Time"
              type="time"
              value={form.startTime}
              onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="event-location"
              label="Location"
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              placeholder="Optional"
            />
            <Input
              id="event-semester"
              label="Semester"
              type="number"
              min={1}
              value={form.semester}
              onChange={(event) => setForm((prev) => ({ ...prev, semester: event.target.value }))}
              placeholder="Optional"
            />
          </div>

          <Input
            id="event-description"
            label="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Optional description"
          />

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-600">Scholar, event type, title, date, and start time are required.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create event'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default SupervisorEvents;