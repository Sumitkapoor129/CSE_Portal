import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { APPROVAL_STATUS_LABELS, APPROVAL_STATUS_STYLE } from '../../utils/constants';

export function StudentCourses(): JSX.Element {
  const { user } = useAuth();
  const {
    data: semesters,
    loading: semestersLoading,
    error: semestersError,
    refetch: refetchSemesters,
  } = useApi(studentApi.getSemesters);
  const { data: profile } = useApi(studentApi.getProfile);
  const [selectedId, setSelectedId] = useState('');
  const semesterList = semesters ?? [];
  const semesterId = selectedId || (semesterList.length > 0 ? semesterList[0]._id : '');
  const { data: courses, loading: coursesLoading, error: coursesError, refetch: refetchCourses } = useApi(
    (opts) => (semesterId ? studentApi.getCourses(semesterId, opts) : Promise.resolve([])),
    [semesterId]
  );

  const [semesterOpen, setSemesterOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [semesterError, setSemesterError] = useState<string | null>(null);
  const [semesterSubmitting, setSemesterSubmitting] = useState(false);

  const nextSemester = semesterList.reduce((max, semester) => Math.max(max, semester.semesterNumber), 0) + 1;

  const [courseOpen, setCourseOpen] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [credits, setCredits] = useState('');
  const [courseError, setCourseError] = useState<string | null>(null);
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const loading = semestersLoading || coursesLoading;
  const error = semestersError || coursesError;

  const retryAll = () => {
    refetchSemesters();
    refetchCourses();
  };

  const openSemesterModal = () => {
    setAcademicYear('');
    setStartDate('');
    setEndDate('');
    setSemesterError(null);
    setSemesterOpen(true);
  };

  const handleCreateSemester = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (semesterSubmitting) return;
    if (!academicYear.trim()) {
      setSemesterError('Academic year is required.');
      return;
    }
    setSemesterSubmitting(true);
    setSemesterError(null);
    try {
      const created = await studentApi.createSemester({
        semesterNumber: nextSemester,
        academicYear: academicYear.trim(),
        startDate,
        endDate,
      });
      setSemesterOpen(false);
      setSemesterSubmitting(false);
      setSelectedId(created._id);
      refetchSemesters();
    } catch {
      setSemesterSubmitting(false);
      setSemesterError('Unable to add the semester. Please try again.');
    }
  };

  const openCourseModal = () => {
    setCourseCode('');
    setCourseName('');
    setCredits('');
    setCourseError(null);
    setCourseOpen(true);
  };

  const handleRequestCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (courseSubmitting || !semesterId) return;
    if (!courseCode.trim() || !courseName.trim()) {
      setCourseError('Course code and name are required.');
      return;
    }
    const creditValue = Number.parseFloat(credits);
    if (!Number.isFinite(creditValue) || creditValue <= 0) {
      setCourseError('Enter a valid number of credits.');
      return;
    }
    setCourseSubmitting(true);
    setCourseError(null);
    try {
      await studentApi.addCourse(semesterId, {
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        credits: creditValue,
      });
      setCourseOpen(false);
      setCourseSubmitting(false);
      refetchCourses();
    } catch {
      setCourseSubmitting(false);
      setCourseError('Unable to request the course. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Courses"
        description="Manage your semesters and course registrations."
        actions={
          <Button onClick={openSemesterModal} variant="secondary">
            Add Semester
          </Button>
        }
      />
      {loading && (
        <div className="space-y-6">
          <SkeletonCards count={2} />
          <SkeletonTable rows={4} />
        </div>
      )}
      {error && !loading && <QueryError error={error} onRetry={retryAll} />}
      {!loading && !error && profile && !profile.supervisor && (
        <Alert variant="info">A supervisor must be assigned before you can request courses.</Alert>
      )}
      {!loading && !error && semesterList.length === 0 && (
        <Card padded={false}>
          <EmptyState
            title="No semesters yet"
            message="Add your first semester to start recording courses."
            action={
              <ButtonLink to="/student/onboarding" variant="primary" size="sm">
                Add Semester
              </ButtonLink>
            }
          />
        </Card>
      )}
      {!loading && !error && semesterList.length > 0 && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-900">Courses</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={semesterId}
                onChange={(event) => setSelectedId(event.target.value)}
                options={semesterList.map((semester) => ({
                  value: semester._id,
                  label: `Semester ${semester.semesterNumber} · ${semester.academicYear}`,
                }))}
                aria-label="Semester"
                className="w-full sm:w-56"
              />
              {profile?.supervisor && (
                <Button onClick={openCourseModal} variant="secondary" size="sm">
                  Request Course
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Table
              columns={[
                { key: 'code', header: 'Code' },
                { key: 'name', header: 'Name' },
                { key: 'credits', header: 'Credits' },
                { key: 'status', header: 'Status' },
              ]}
            >
              {(courses ?? []).length === 0 ? (
                <TableEmpty colSpan={4} message="No courses requested for this semester." />
              ) : (
                (courses ?? []).map((course) => (
                  <TableRow key={course._id}>
                    <TableCell className="font-medium text-gray-900">{course.courseCode}</TableCell>
                    <TableCell className="text-gray-700">{course.courseName}</TableCell>
                    <TableCell className="text-gray-700">{course.credits}</TableCell>
                    <TableCell>
                      <Badge label={APPROVAL_STATUS_LABELS[course.status]} className={APPROVAL_STATUS_STYLE[course.status]} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </div>
        </Card>
      )}

      <Modal open={semesterOpen} onClose={() => setSemesterOpen(false)} title="Add Semester">
        <form onSubmit={handleCreateSemester} className="space-y-4" noValidate>
          {semesterError && <Alert variant="error">{semesterError}</Alert>}
          <p className="text-sm text-gray-700">Semester {nextSemester} will be added.</p>
          <Input
            id="semester-year"
            label="Academic Year"
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            placeholder="e.g. 2025-26"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="semester-start"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              id="semester-end"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setSemesterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={semesterSubmitting}>
              {semesterSubmitting ? 'Adding…' : 'Add semester'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={courseOpen} onClose={() => setCourseOpen(false)} title="Request Course">
        <form onSubmit={handleRequestCourse} className="space-y-4" noValidate>
          {courseError && <Alert variant="error">{courseError}</Alert>}
          <Input
            id="course-code"
            label="Course Code"
            value={courseCode}
            onChange={(event) => setCourseCode(event.target.value)}
            placeholder="e.g. CSE601"
          />
          <Input
            id="course-name"
            label="Course Name"
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            placeholder="e.g. Advanced Algorithms"
          />
          <Input
            id="course-credits"
            label="Credits"
            type="number"
            min={1}
            step="0.5"
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCourseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={courseSubmitting}>
              {courseSubmitting ? 'Requesting…' : 'Request course'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default StudentCourses;