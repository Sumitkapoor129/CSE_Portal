import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
import { Tabs } from '../../components/ui/Tabs';
import { STUDENT_TYPE_LABELS, STUDENT_TYPE_OPTIONS } from '../../utils/constants';

type ProgramKey = 'phd' | 'mtech' | 'btech' | 'mca';

const PROGRAM_TABS: { key: ProgramKey; label: string }[] = [
  { key: 'phd', label: 'PhD' },
  { key: 'mtech', label: 'M-Tech' },
  { key: 'btech', label: 'B-Tech' },
  { key: 'mca', label: 'MCA' },
];

export function StudentList(): JSX.Element {
  const { user } = useAuth();

  const [program, setProgram] = useState<ProgramKey>('phd');
  const [myRole, setMyRole] = useState('');
  const [name, setName] = useState('');
  const [appliedName, setAppliedName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentType, setStudentType] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedName(name);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  const [appliedRoll, setAppliedRoll] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedRoll(rollNumber);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [rollNumber]);

  const { data, loading, error, refetch } = useApi(
    (opts) =>
      supervisorApi.getAssignedStudents(
        {
          name: appliedName || undefined,
          rollNumber: appliedRoll || undefined,
          studentType: studentType || undefined,
          program,
          myRole: myRole || undefined,
          page,
          limit: 20,
        },
        opts
      ),
    [appliedName, appliedRoll, studentType, program, myRole, page]
  );

  const hasFilters = Boolean(name || rollNumber || studentType || myRole);

  const clearFilters = () => {
    setName('');
    setAppliedName('');
    setRollNumber('');
    setAppliedRoll('');
    setStudentType('');
    setMyRole('');
    setPage(1);
  };

  if (user?.role !== 'supervisor') return <Navigate to="/" replace />;

  const students = data?.students ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <PageHeader title="My Students" description="Scholars assigned to you for supervision." />

      <div className="mb-6">
        <Tabs
          tabs={PROGRAM_TABS}
          active={program}
          onChange={(key) => {
            setProgram(key as ProgramKey);
            setPage(1);
          }}
        />
      </div>

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            onChange={(event) => setRollNumber(event.target.value)}
            placeholder="e.g. 22CSP001"
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
          <Select
            id="filter-my-role"
            label="My Role"
            value={myRole}
            onChange={(event) => {
              setMyRole(event.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'co_supervisor', label: 'Co-supervisor' },
            ]}
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

      <div
        role="tabpanel"
        id={`tabpanel-${program}`}
        aria-labelledby={`tab-${program}`}
        tabIndex={0}
        className="focus:outline-none"
      >
        {loading && <SkeletonTable rows={6} columns={5} />}
        {error && !loading && <QueryError error={error} onRetry={refetch} />}
        {!loading && !error && (
          <Card title={`${PROGRAM_TABS.find((p) => p.key === program)?.label ?? 'Program'} Students`} padded={false}>
            <Table
              ariaLabel="Program Students Directory"
              columns={[
                { key: 'name', header: 'Name' },
                { key: 'rollNumber', header: 'Roll Number' },
                { key: 'department', header: 'Department' },
                { key: 'studentType', header: 'Student Type' },
                { key: 'myRole', header: 'My Role' },
              ]}
            >
              {students.length === 0 ? (
                <TableEmpty colSpan={5} message="No students found." />
              ) : (
                students.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-medium text-gray-900">
                      <Link
                        to={`/supervisor/students/${student._id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {student.user?.name ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-700">{student.rollNumber}</TableCell>
                    <TableCell className="text-gray-700">{student.department}</TableCell>
                    <TableCell>
                      <Badge label={STUDENT_TYPE_LABELS[student.studentType]} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        label={student.myRole === 'co_supervisor' ? 'Co-supervisor' : 'Supervisor'}
                        className={
                          student.myRole === 'co_supervisor'
                            ? 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200'
                            : 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200'
                        }
                      />
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
      </div>
    </>
  );
}

export default StudentList;
