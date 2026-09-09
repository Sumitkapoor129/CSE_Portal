import { useEffect, useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { ParticipantPicker } from '../../components/shared/ParticipantPicker';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import { EVENT_TYPE_LABELS, EVENT_TYPE_OPTIONS } from '../../utils/constants';
import type { EventType, EventView, StudentProfileView } from '../../types';

const EMPTY_FORM = {
  title: '',
  eventType: 'seminar' as EventType,
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  deadline: '',
};

function toTimeValue(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function EventManagement(): JSX.Element {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useApi(
    () => adminApi.listEvents({ page, limit: 10 }),
    [page]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventView | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [options, setOptions] = useState<StudentProfileView[]>([]);
  const [optionsError, setOptionsError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [confirmDelete, setConfirmDelete] = useState<EventView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || options.length === 0) return;
    const userToProfileId = new Map<string, string>();
    for (const student of options) {
      if (student.user?._id) {
        userToProfileId.set(student.user._id, student._id);
      }
    }
    const participantIds = (editing.participants ?? [])
      .map((participant) => userToProfileId.get(String(participant.participant)))
      .filter((id): id is string => Boolean(id));
    setSelected(participantIds);
  }, [editing, options]);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const events = data?.events ?? [];
  const pagination = data?.pagination;

  const loadOptions = () => {
    setOptions([]);
    setOptionsError(false);
    adminApi
      .listStudents({ limit: 100 })
      .then((result) => setOptions(result.students))
      .catch(() => setOptionsError(true));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelected([]);
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setModalOpen(true);
    loadOptions();
  };

  const openEdit = (event: EventView) => {
    setForm({
      title: event.title,
      eventType: event.eventType,
      description: event.description ?? '',
      date: formatDate(event.date),
      startTime: toTimeValue(event.startTime),
      endTime: toTimeValue(event.endTime),
      location: event.location ?? '',
      deadline: event.deadline ? formatDate(event.deadline) : '',
    });
    setEditing(event);
    setModalOpen(true);
    loadOptions();
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setSubmitting(false);
    setFormError(null);
  };

  const toggleParticipant = (profileId: string) => {
    setSelected((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) {
      setFormError('Title, date, start time, and end time are required.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      eventType: form.eventType,
      description: form.description.trim() || undefined,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location.trim() || undefined,
      participants: selected,
      deadline: form.deadline || undefined,
    };
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await adminApi.updateEvent(editing._id, payload);
      } else {
        await adminApi.createEvent(payload);
      }
      closeModal();
      setSuccessMessage(editing ? 'Event updated successfully.' : 'Event created successfully.');
      setPage(1);
      refetch();
    } catch {
      setSubmitting(false);
      setFormError('Unable to save the event. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteEvent(confirmDelete._id);
      setDeleteError(null);
      setConfirmDelete(null);
      setDeleting(false);
      setSuccessMessage('Event deleted successfully.');
      refetch();
    } catch {
      setDeleting(false);
      setDeleteError('Unable to delete the event. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Event Management"
        description="Schedule events and invite scholars."
        actions={<Button onClick={openCreate}>Create Event</Button>}
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
          <Table
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'type', header: 'Type' },
              { key: 'date', header: 'Date' },
              { key: 'location', header: 'Location' },
              { key: 'participants', header: 'Participants' },
              { key: 'actions', header: 'Actions' },
            ]}
          >
            {events.length === 0 ? (
              <TableEmpty colSpan={6} message="No events scheduled." />
            ) : (
              events.map((event) => (
                <TableRow key={event._id}>
                  <TableCell className="font-medium text-gray-900">{event.title}</TableCell>
                  <TableCell>
                    <Badge label={EVENT_TYPE_LABELS[event.eventType]} />
                  </TableCell>
                  <TableCell className="text-gray-700">{formatDate(event.date)}</TableCell>
                  <TableCell className="text-gray-700">{event.location || '—'}</TableCell>
                  <TableCell className="text-gray-700">{event.participants?.length ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(event)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null);
                          setConfirmDelete(event);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4">
              <Pagination page={page} totalPages={pagination.totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Event' : 'Create Event'}
        maxWidth="xl"
      >
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <Input
              id="event-deadline"
              label="Deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="event-location"
              label="Location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="Optional"
            />
            <Input
              id="event-description"
              label="Description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Optional description"
            />
          </div>
          <ParticipantPicker
            options={options.map((student) => ({
              id: student._id,
              name: student.user?.name ?? 'Unknown',
              rollNumber: student.rollNumber,
              department: student.department,
            }))}
            selected={selected}
            loading={options.length === 0 && !optionsError}
            onToggle={toggleParticipant}
          />
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400">Title, date, start, and end time are required.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete Event"
        message={
          <>
            Are you sure you want to delete <span className="font-medium">{confirmDelete?.title}</span>? This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        busyLabel="Deleting…"
        error={deleteError ?? undefined}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default EventManagement;