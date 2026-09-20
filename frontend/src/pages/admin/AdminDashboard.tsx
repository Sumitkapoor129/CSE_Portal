import { useState, useMemo } from 'react';
import type { FormEvent, JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
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
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { formatDate } from '../../utils/formatDate';
import {
  EXAMINER_STATUS_LABELS,
  EXAMINER_STATUS_STYLE,
  INTERNSHIP_STATUS_LABELS,
  INTERNSHIP_STATUS_STYLE,
} from '../../utils/constants';
import type { ExaminerCategory, ExternalExaminer, ExternalExaminerStatus, Internship } from '../../types';

type AdminDashboardTab = 'dues' | 'examiners' | 'internships';

export function AdminDashboard(): JSX.Element {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>('dues');
  const [duesFilter, setDuesFilter] = useState<'all' | 'overdue' | 'due_soon'>('all');

  const { data, loading, error, refetch } = useApi(adminApi.getDashboard);

  // Examiners data
  const {
    data: examiners,
    loading: examinersLoading,
    error: examinersError,
    refetch: refetchExaminers,
  } = useApi(adminApi.getExternalExaminers);

  // Internships data
  const {
    data: allInternships,
    loading: internshipsLoading,
    error: internshipsError,
    refetch: refetchInternships,
  } = useApi(adminApi.listAllInternships);

  // Appoint examiner modal state
  const [appointModalOpen, setAppointModalOpen] = useState(false);
  const [appointStudentId, setAppointStudentId] = useState('');
  const [appointThesisId, setAppointThesisId] = useState('');
  const [appointName, setAppointName] = useState('');
  const [appointEmail, setAppointEmail] = useState('');
  const [appointInstitution, setAppointInstitution] = useState('');
  const [appointDate, setAppointDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointSubmitting, setAppointSubmitting] = useState(false);
  const [appointError, setAppointError] = useState<string | null>(null);

  // Update examiner modal state
  const [updatingExaminer, setUpdatingExaminer] = useState<ExternalExaminer | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ExternalExaminerStatus>('invited');
  const [updateCategory, setUpdateCategory] = useState<ExaminerCategory | ''>('');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Admin review internship modal state
  const [adminReviewInternship, setAdminReviewInternship] = useState<Internship | null>(null);
  const [adminInternshipDecision, setAdminInternshipDecision] = useState<'admin_approved' | 'rejected'>('admin_approved');
  const [adminInternshipComment, setAdminInternshipComment] = useState('');
  const [adminInternshipSubmitting, setAdminInternshipSubmitting] = useState(false);
  const [adminInternshipError, setAdminInternshipError] = useState<string | null>(null);
  const [internshipFilter, setInternshipFilter] = useState<'pending' | 'all'>('pending');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const deptDues = data?.departmentDues?.dues || [];
  const overdueCount = data?.departmentDues?.overdueCount || 0;
  const dueSoonCount = data?.departmentDues?.dueSoonCount || 0;
  const expiringRegCount = data?.departmentDues?.expiringRegistrationCount || 0;

  const filteredDues = useMemo(() => {
    return deptDues.filter((item) => {
      if (duesFilter === 'overdue') return item.status === 'overdue';
      if (duesFilter === 'due_soon') return item.status === 'due_soon';
      return true;
    });
  }, [deptDues, duesFilter]);

  const pendingAdminInternships = useMemo(() => {
    return (allInternships ?? []).filter((item) => item.status === 'supervisor_approved');
  }, [allInternships]);

  const displayedInternships = useMemo(() => {
    if (internshipFilter === 'pending') return pendingAdminInternships;
    return allInternships ?? [];
  }, [internshipFilter, pendingAdminInternships, allInternships]);

  const handleAppointExaminer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (appointSubmitting) return;

    if (!appointStudentId.trim() || !appointName.trim() || !appointEmail.trim() || !appointInstitution.trim()) {
      setAppointError('Student ID, Name, Email, and Institution are required.');
      return;
    }

    setAppointSubmitting(true);
    setAppointError(null);
    try {
      await adminApi.addExternalExaminer({
        studentId: appointStudentId.trim(),
        thesisId: appointThesisId.trim() || appointStudentId.trim(),
        examinerName: appointName.trim(),
        examinerEmail: appointEmail.trim(),
        institution: appointInstitution.trim(),
        invitationDate: appointDate,
      });
      setAppointModalOpen(false);
      setAppointName('');
      setAppointEmail('');
      setAppointInstitution('');
      setAppointStudentId('');
      setAppointThesisId('');
      setAppointSubmitting(false);
      setSuccessMessage('External examiner appointed. 4-week response tracker initiated.');
      refetchExaminers();
    } catch (err: unknown) {
      setAppointSubmitting(false);
      setAppointError(err instanceof Error ? err.message : 'Failed to appoint external examiner.');
    }
  };

  const handleUpdateExaminer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (updateSubmitting || !updatingExaminer) return;

    setUpdateSubmitting(true);
    setUpdateError(null);
    try {
      await adminApi.updateExternalExaminer(updatingExaminer._id, {
        status: updateStatus,
        category: updateCategory ? updateCategory : undefined,
        remarks: updateRemarks.trim() || undefined,
      });
      setUpdatingExaminer(null);
      setUpdateSubmitting(false);
      setSuccessMessage('Examiner record updated successfully.');
      refetchExaminers();
    } catch (err: unknown) {
      setUpdateSubmitting(false);
      setUpdateError(err instanceof Error ? err.message : 'Failed to update examiner record.');
    }
  };

  const handleAdminReviewInternship = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (adminInternshipSubmitting || !adminReviewInternship) return;

    setAdminInternshipSubmitting(true);
    setAdminInternshipError(null);
    try {
      await adminApi.reviewInternship(adminReviewInternship._id, {
        status: adminInternshipDecision,
        adminComment: adminInternshipComment.trim() || undefined,
      });
      setAdminReviewInternship(null);
      setAdminInternshipComment('');
      setAdminInternshipSubmitting(false);
      setSuccessMessage(`Internship request ${adminInternshipDecision === 'admin_approved' ? 'approved' : 'rejected'}.`);
      refetchInternships();
    } catch (err: unknown) {
      setAdminInternshipSubmitting(false);
      setAdminInternshipError(err instanceof Error ? err.message : 'Failed to review internship.');
    }
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of students, faculty, ordinance timeline dues, external examiners, and leaves."
        actions={
          <>
            <ButtonLink to="/admin/students?create=1">Create Student</ButtonLink>
            <ButtonLink to="/admin/faculty?create=1" variant="secondary">
              Create Faculty
            </ButtonLink>
            <ButtonLink to="/admin/events" variant="secondary">
              Create Event
            </ButtonLink>
            <ButtonLink to="/admin/deadlines" variant="secondary">
              Create Deadline
            </ButtonLink>
          </>
        }
      />

      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {loading && (
        <div className="space-y-6">
          <SkeletonCards count={4} />
          <SkeletonTable rows={4} />
        </div>
      )}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Students" value={data.totalStudents} sub="registered scholars" to="/admin/students" />
            <StatCard label="Total Faculty" value={data.totalFaculty} sub="supervisors on record" to="/admin/faculty" />
            <StatCard
              label="Overdue Milestones"
              value={<span className={overdueCount > 0 ? 'text-red-700' : undefined}>{overdueCount}</span>}
              sub={overdueCount > 0 ? 'scholars past deadline' : 'none overdue'}
            />
            <StatCard
              label="Expiring Registrations"
              value={<span className={expiringRegCount > 0 ? 'text-amber-700' : undefined}>{expiringRegCount}</span>}
              sub="8-year validity limit"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Upcoming Events" value={data.totalEvents} sub="events scheduled" to="/admin/events" />
            <StatCard label="Pending Approvals" value={data.pendingApprovals} sub="awaiting review" />
            <StatCard label="Approaching Deadlines" value={dueSoonCount} sub="within warning window" />
          </div>

          <Tabs
            tabs={[
              { key: 'dues', label: `Ordinance Timeline Dues (${deptDues.length})` },
              { key: 'examiners', label: `External Examiners Panel (${examiners?.length ?? 0})` },
              { key: 'internships', label: `Internship Approvals (${allInternships?.length ?? 0})` },
            ]}
            active={activeTab}
            onChange={(key) => setActiveTab(key as AdminDashboardTab)}
          />

          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
            className="focus:outline-none"
          >
            {/* TAB 1: Department Ordinance Timeline & Dues Tracker */}
            {activeTab === 'dues' && (
              <Card
                title="Department Ordinance Timeline & Dues Tracker"
                padded={false}
                actions={
                  <div role="group" aria-label="Filter timeline dues" className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDuesFilter('all')}
                      aria-pressed={duesFilter === 'all'}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
                        duesFilter === 'all'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All ({deptDues.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuesFilter('overdue')}
                      aria-pressed={duesFilter === 'overdue'}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                        duesFilter === 'overdue'
                          ? 'bg-red-100 text-red-800 border border-red-300 font-semibold'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      Overdue ({overdueCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuesFilter('due_soon')}
                      aria-pressed={duesFilter === 'due_soon'}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        duesFilter === 'due_soon'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      Due Soon ({dueSoonCount})
                    </button>
                  </div>
                }
              >
                {filteredDues.length === 0 ? (
                  <EmptyState
                    title="No dues found"
                    message={
                      duesFilter === 'all'
                        ? 'All students are on schedule with ordinance timelines.'
                        : `No ${duesFilter.replace('_', ' ')} items at this time.`
                    }
                  />
                ) : (
                  <Table
                    ariaLabel="Department Ordinance Timeline and Dues Tracker"
                    columns={[
                      { key: 'scholar', header: 'Scholar' },
                      { key: 'milestone', header: 'Due Milestone / Task' },
                      { key: 'target', header: 'Ordinance Deadline' },
                      { key: 'status', header: 'Timeline Status' },
                      { key: 'action', header: 'Action' },
                    ]}
                  >
                    {filteredDues.map((due) => (
                      <TableRow key={`${due.studentId}-${due.dueMilestone}`}>
                        <TableCell>
                          <div>
                            <Link
                              to={`/admin/students?search=${encodeURIComponent(due.rollNumber)}`}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              {due.studentName}
                            </Link>
                            <p className="text-xs text-gray-500">Roll: {due.rollNumber} · {due.department}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{due.dueMilestone}</TableCell>
                        <TableCell className="text-gray-600">
                          {due.dueDate ? formatDate(due.dueDate) : 'Immediate'}
                        </TableCell>
                        <TableCell>
                          {due.status === 'overdue' ? (
                            <Badge
                              label={`${Math.abs(due.daysDiff)}d overdue`}
                              className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                            />
                          ) : (
                            <Badge
                              label={`Due in ${due.daysDiff}d`}
                              className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/admin/students?search=${encodeURIComponent(due.rollNumber)}`}
                            aria-label={`${due.action} for ${due.studentName}`}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                          >
                            {due.action} →
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Table>
                )}
              </Card>
            )}

            {/* TAB 2: External Examiners & 4-Week Tracker */}
            {activeTab === 'examiners' && (
              <div className="space-y-6">
                <Card
                  title="External Examiners Panel & 4-Week Response Tracker"
                  padded={false}
                  actions={
                    <Button
                      size="sm"
                      onClick={() => {
                        setAppointModalOpen(true);
                        setAppointError(null);
                      }}
                    >
                      Appoint External Examiner
                    </Button>
                  }
                >
                  <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 text-xs text-gray-600">
                    <p>
                      <strong>Ordinance Policy:</strong> If an invited examiner does not respond within{' '}
                      <strong>4 weeks (28 days)</strong>, another examiner should be appointed. For Category III
                      evaluations, examiners are requested to respond within 4 weeks.
                    </p>
                  </div>

                  {examinersLoading ? (
                    <div className="p-4">
                      <SkeletonCards count={2} />
                    </div>
                  ) : examinersError ? (
                    <QueryError error={examinersError} onRetry={refetchExaminers} />
                  ) : (
                    <Table
                      ariaLabel="External Examiners Panel"
                      columns={[
                        { key: 'examiner', header: 'Examiner' },
                        { key: 'institution', header: 'Institution' },
                        { key: 'invitation', header: 'Invited / Response Due' },
                        { key: 'status', header: 'Status' },
                        { key: 'category', header: 'Category' },
                        { key: 'action', header: 'Action' },
                      ]}
                    >
                      {!examiners || examiners.length === 0 ? (
                        <TableEmpty colSpan={6} message="No external examiners currently appointed." />
                      ) : (
                        examiners.map((ex) => {
                          const isPastDue = ex.isOverdue;
                          return (
                            <TableRow key={ex._id}>
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-gray-900">{ex.examinerName}</p>
                                  <p className="text-xs text-gray-500">{ex.examinerEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-700">{ex.institution}</TableCell>
                              <TableCell>
                                <div className="text-xs">
                                  <p className="text-gray-700">Invited: {formatDate(ex.invitationDate)}</p>
                                  <p className={isPastDue ? 'font-medium text-red-700' : 'text-gray-500'}>
                                    Due: {formatDate(ex.responseDueDate)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge
                                    label={EXAMINER_STATUS_LABELS[ex.status]}
                                    className={EXAMINER_STATUS_STYLE[ex.status]}
                                  />
                                  {isPastDue && (
                                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                                      Overdue (&gt;4 Weeks)
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {ex.category ? (
                                  <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                                    Cat {ex.category}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      setUpdatingExaminer(ex);
                                      setUpdateStatus(ex.status);
                                      setUpdateCategory(ex.category || '');
                                      setUpdateRemarks(ex.remarks || '');
                                      setUpdateError(null);
                                    }}
                                  >
                                    Update
                                  </Button>
                                  {isPastDue && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setAppointModalOpen(true);
                                        setAppointName('');
                                        setAppointEmail('');
                                        setAppointInstitution('');
                                        setAppointStudentId(
                                          typeof ex.student === 'object' && ex.student !== null
                                            ? ex.student._id
                                            : (ex.student as string)
                                        );
                                        setAppointThesisId(ex.thesis);
                                      }}
                                    >
                                      Replace
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </Table>
                  )}
                </Card>
              </div>
            )}

            {/* TAB 3: Department Internship Approvals */}
            {activeTab === 'internships' && (
              <Card title="Department Internship & Research Leave Endorsement" padded={false}>
                {internshipsLoading ? (
                  <div className="p-4">
                    <SkeletonCards count={2} />
                  </div>
                ) : internshipsError ? (
                  <QueryError error={internshipsError} onRetry={refetchInternships} />
                ) : (
                  <Table
                    ariaLabel="Department Internships"
                    columns={[
                      { key: 'scholar', header: 'Scholar' },
                      { key: 'org', header: 'Host Organization' },
                      { key: 'topic', header: 'Research Topic' },
                      { key: 'duration', header: 'Duration' },
                      { key: 'status', header: 'Current Status' },
                      { key: 'action', header: 'Admin Decision' },
                    ]}
                  >
                    {!allInternships || allInternships.length === 0 ? (
                      <TableEmpty colSpan={6} message="No student internship requests on record." />
                    ) : (
                      allInternships.map((intern) => {
                        const student = typeof intern.student === 'object' ? intern.student : null;
                        const isAwaitingAdmin = intern.status === 'supervisor_approved';

                        return (
                          <TableRow key={intern._id}>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-gray-900">{student?.user?.name || 'Scholar'}</p>
                                <p className="text-xs text-gray-500">Roll: {student?.rollNumber || '—'}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-gray-900">{intern.organization}</TableCell>
                            <TableCell className="text-gray-700">{intern.researchTopic}</TableCell>
                            <TableCell className="text-gray-700">{intern.durationMonths} months</TableCell>
                            <TableCell>
                              <Badge
                                label={INTERNSHIP_STATUS_LABELS[intern.status]}
                                className={INTERNSHIP_STATUS_STYLE[intern.status]}
                              />
                            </TableCell>
                            <TableCell>
                              {isAwaitingAdmin ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setAdminReviewInternship(intern);
                                      setAdminInternshipDecision('admin_approved');
                                      setAdminInternshipComment('');
                                      setAdminInternshipError(null);
                                    }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      setAdminReviewInternship(intern);
                                      setAdminInternshipDecision('rejected');
                                      setAdminInternshipComment('');
                                      setAdminInternshipError(null);
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  {intern.adminComment ? `Admin: ${intern.adminComment}` : 'Complete'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </Table>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Appoint Examiner Modal */}
      <Modal
        open={appointModalOpen}
        onClose={() => setAppointModalOpen(false)}
        title="Appoint External Thesis Examiner"
      >
        <form onSubmit={handleAppointExaminer} className="space-y-4" noValidate>
          {appointError && <Alert variant="error">{appointError}</Alert>}
          <Input
            id="student-id"
            label="Student Profile ID or Roll Number"
            value={appointStudentId}
            onChange={(e) => setAppointStudentId(e.target.value)}
            placeholder="Database Student ID"
            required
          />
          <Input
            id="examiner-name"
            label="Examiner Full Name"
            value={appointName}
            onChange={(e) => setAppointName(e.target.value)}
            placeholder="Prof. John Doe"
            required
          />
          <Input
            id="examiner-email"
            type="email"
            label="Examiner Email"
            value={appointEmail}
            onChange={(e) => setAppointEmail(e.target.value)}
            placeholder="examiner@university.edu"
            required
          />
          <Input
            id="examiner-inst"
            label="University / Institution"
            value={appointInstitution}
            onChange={(e) => setAppointInstitution(e.target.value)}
            placeholder="e.g. IIT Bombay, MIT, Cambridge"
            required
          />
          <Input
            id="inv-date"
            type="date"
            label="Invitation Date"
            value={appointDate}
            onChange={(e) => setAppointDate(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500">
            * Automatic tracking: The system sets a 28-day (4 weeks) deadline from this invitation date.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAppointModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={appointSubmitting}>
              {appointSubmitting ? 'Appointing…' : 'Appoint Examiner'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Examiner Modal */}
      <Modal
        open={updatingExaminer !== null}
        onClose={() => setUpdatingExaminer(null)}
        title={updatingExaminer ? `Update ${updatingExaminer.examinerName}` : ''}
      >
        {updatingExaminer && (
          <form onSubmit={handleUpdateExaminer} className="space-y-4" noValidate>
            {updateError && <Alert variant="error">{updateError}</Alert>}
            <div>
              <label htmlFor="ex-status" className="block text-xs font-medium text-gray-700">
                Examiner Status
              </label>
              <select
                id="ex-status"
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value as ExternalExaminerStatus)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="invited">Invited (Awaiting Response)</option>
                <option value="accepted">Accepted Invitation</option>
                <option value="declined">Declined</option>
                <option value="report_submitted">Report Submitted</option>
                <option value="overdue_replacement_required">Overdue - Replacement Required</option>
              </select>
            </div>

            <div>
              <label htmlFor="ex-cat" className="block text-xs font-medium text-gray-700">
                Evaluation Category (if report submitted)
              </label>
              <select
                id="ex-cat"
                value={updateCategory}
                onChange={(e) => setUpdateCategory(e.target.value as ExaminerCategory | '')}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None / Under Review</option>
                <option value="I">Category I (Accepted as is)</option>
                <option value="II">Category II (Minor revisions accepted)</option>
                <option value="III">Category III (Re-evaluation required - 4 weeks response)</option>
              </select>
            </div>

            <Input
              id="ex-remarks"
              label="Administrative Remarks"
              value={updateRemarks}
              onChange={(e) => setUpdateRemarks(e.target.value)}
              placeholder="Notes on communication, courier dispatch, etc."
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setUpdatingExaminer(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSubmitting}>
                {updateSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Admin Review Internship Modal */}
      <Modal
        open={adminReviewInternship !== null}
        onClose={() => setAdminReviewInternship(null)}
        title={adminReviewInternship ? `Admin ${adminInternshipDecision === 'admin_approved' ? 'Approval' : 'Rejection'} for Internship` : ''}
      >
        {adminReviewInternship && (
          <form onSubmit={handleAdminReviewInternship} className="space-y-4" noValidate>
            {adminInternshipError && <Alert variant="error">{adminInternshipError}</Alert>}
            <div className="rounded-md border border-gray-200 bg-gray-50/50 p-3 text-xs text-gray-700">
              <p><strong>Host:</strong> {adminReviewInternship.organization}</p>
              <p className="mt-1"><strong>Topic:</strong> {adminReviewInternship.researchTopic}</p>
              <p className="mt-1"><strong>Duration:</strong> {adminReviewInternship.durationMonths} months</p>
              {adminReviewInternship.supervisorComment && (
                <p className="mt-1 text-blue-700">
                  <strong>Supervisor Endorsement:</strong> {adminReviewInternship.supervisorComment}
                </p>
              )}
            </div>
            <Input
              id="admin-intern-comment"
              label="Admin Remarks / Notification Comment"
              value={adminInternshipComment}
              onChange={(e) => setAdminInternshipComment(e.target.value)}
              placeholder="Dean/HOD approval reference number, remarks"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setAdminReviewInternship(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adminInternshipSubmitting}>
                {adminInternshipSubmitting ? 'Processing…' : 'Confirm Decision'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default AdminDashboard;