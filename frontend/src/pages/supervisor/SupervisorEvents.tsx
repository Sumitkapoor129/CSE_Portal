import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { supervisorApi } from '../../api/supervisor';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { ParticipantPicker } from '../../components/shared/ParticipantPicker';
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
import { EVENT_TYPE_LABELS, EVENT_TYPE_OPTIONS } from '../../utils/constants';
import type { EventType, StudentOption } from '../../types';

const EMPTY_FORM = {
  title: '',
  eventType: 'seminar' as EventType,
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  semester: '',
  deadline: '',
};

export function SupervisorEvents(): JSX.Element {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useApi(
    () => supervisorApi.getEvents({ page, limit: 10 }),
    [page]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [optionsError, setOptionsError] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const events = data?.events ?? [];
  const pagination = data?.pagination;

  const openModal = () => {
    setForm(EMPTY_FORM);
    setSelected([]);
    setFormError(null);
    setOptionsError(false);
    setModalOpen(true);
    setOptions([]);
    supervisorApi
      .getStudentOptions()
      .then((result) => setOptions(result))
      .catch(() => setOptionsError(true));
  };

  const toggleParticipant = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) {
      setFormError('Title, date, start time, and end time are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await supervisorApi.createEvent({
        title: form.title.trim(),
        eventType: form.eventType,
        description: form.description.trim() || undefined,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location.trim() || undefined,
        participants: selected,
        semester: form.semester.trim() || undefined,
        deadline: form.deadline || undefined,
      });
      setModalOpen(false);
      setSubmitting(false);
      setSuccessMessage('Event created successfully.');
      setPage(1);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to create the event. Please try again.');
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
              columns={[
                { key: 'title', header: 'Title' },
                { key: 'type', header: 'Type' },
                { key: 'date', header: 'Date' },
                { key: 'location', header: 'Location' },
                { key: 'participants', header: 'Participants' },
              ]}
            >
              {events.map((event) => (
                <TableRow key={event._id}>
                  <TableCell className="font-medium text-gray-900">{event.title}</TableCell>
                  <TableCell>
                    <Badge label={EVENT_TYPE_LABELS[event.eventType]} />
                  </TableCell>
                  <TableCell className="text-gray-500">{formatDate(event.date)}</TableCell>
                  <TableCell className="text-gray-700">{event.location || '—'}</TableCell>
                  <TableCell className="text-gray-700">{event.participants?.length ?? 0}</TableCell>
                </TableRow>
              ))}
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
            <Alert variant="warning">Unable to load student options. Participants can be left empty.</Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <Input
                id="event-title"
                label="Title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                id="event-type"
                label="Event Type"
                value={form.eventType}
                onChange={(event) => setForm({ ...form, eventType: event.target.value as EventType })}
                options={EVENT_TYPE_OPTIONS}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="event-date"
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            <Input
              id="event-start"
              label="Start Time"
              type="time"
              value={form.startTime}
              onChange={(event) => setForm({ ...form, startTime: event.target.value })}
            />
            <Input
              id="event-end"
              label="End Time"
              type="time"
              value={form.endTime}
              onChange={(event) => setForm({ ...form, endTime: event.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="event-deadline"
              label="Deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
            <Input
              id="event-location"
              label="Location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="Optional"
            />
            <Input
              id="event-semester"
              label="Semester"
              type="number"
              min={1}
              value={form.semester}
              onChange={(event) => setForm({ ...form, semester: event.target.value })}
              placeholder="Optional"
            />
          </div>
          <Input
            id="event-description"
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Optional description"
          />
          <ParticipantPicker
            options={options.map((option) => ({
              id: option.userId,
              name: option.name,
              rollNumber: option.rollNumber,
              department: option.department,
            }))}
            selected={selected}
            loading={options.length === 0}
            onToggle={toggleParticipant}
          />
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-600">Title, date, start, and end time are required.</p>
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