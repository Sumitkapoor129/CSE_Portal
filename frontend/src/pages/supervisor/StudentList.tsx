import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { supervisorApi } from '../../api/supervisor';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { STUDENT_TYPE_LABELS, STUDENT_TYPE_OPTIONS } from '../../utils/constants';

export function StudentList(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [appliedName, setAppliedName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState('');
  const [studentType, setStudentType] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedName(name);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  const { data, loading, error, refetch } = useApi(
    () =>
      supervisorApi.getStudents({
        name: appliedName || undefined,
        rollNumber: rollNumber || undefined,
        semester: semester || undefined,
        studentType: studentType || undefined,
        researchArea: researchArea || undefined,
        page,
        limit: 20,
      }),
    [appliedName, rollNumber, semester, studentType, researchArea, page]
  );

  const hasFilters = Boolean(name || rollNumber || semester || studentType || researchArea);

  const clearFilters = () => {
    setName('');
    setAppliedName('');
    setRollNumber('');
    setSemester('');
    setStudentType('');
    setResearchArea('');
    setPage(1);
  };

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const students = data?.students ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <PageHeader title="My Students" description="Scholars assigned to you for supervision." />
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Input
            id="filter-name"
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Search by name"
          />
          <Input
            id="filter-roll"
            label="Roll Number"
            value={rollNumber}
            onChange={(event) => {
              setRollNumber(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. 22CSP001"
          />
          <Input
            id="filter-semester"
            label="Semester"
            value={semester}
            onChange={(event) => {
              setSemester(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. 2"
            type="number"
            min={1}
          />
          <Select
            id="filter-type"
            label="Student Type"
            value={studentType}
            onChange={(event) => {
              setStudentType(event.target.value);
              setPage(1);
            }}
            options={[{ value: '', label: 'All types' }, ...STUDENT_TYPE_OPTIONS]}
          />
          <Input
            id="filter-area"
            label="Research Area"
            value={researchArea}
            onChange={(event) => {
              setResearchArea(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. NLP"
          />
        </div>
        {hasFilters && (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {loading && <SkeletonTable rows={6} columns={5} />}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && (
        <Card title="Students" padded={false}>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'rollNumber', header: 'Roll Number' },
              { key: 'department', header: 'Department' },
              { key: 'studentType', header: 'Student Type' },
              { key: 'researchArea', header: 'Research Area' },
            ]}
          >
            {students.length === 0 ? (
              <TableEmpty colSpan={5} message="No students found." />
            ) : (
              students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/supervisor/students/${student._id}`)}
                      className="text-left"
                    >
                      {student.user?.name ?? '—'}
                    </button>
                  </TableCell>
                  <TableCell className="text-gray-700">{student.rollNumber}</TableCell>
                  <TableCell className="text-gray-700">{student.department}</TableCell>
                  <TableCell>
                    <Badge label={STUDENT_TYPE_LABELS[student.studentType]} />
                  </TableCell>
                  <TableCell className="text-gray-500">{student.researchArea || '—'}</TableCell>
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
    </>
  );
}

export default StudentList;
