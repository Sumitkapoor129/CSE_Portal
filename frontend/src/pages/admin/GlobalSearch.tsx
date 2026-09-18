import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value !== null && typeof value === 'object' ? (value as Row) : {};
}

function userOf(row: Row): Row {
  return asRecord(row.user);
}

function text(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return '—';
}

function resultKey(row: Row, user: Row, prefix: string, index: number): string {
  const candidate = [row._id, row.id, row.rollNumber, row.employeeId, user.email].find(
    (value) => typeof value === 'string' && value.trim() !== ''
  );
  const base = typeof candidate === 'string' ? candidate : `${index}-${text(row.collegeId, row.name)}`;
  return `${prefix}-${base}`;
}

function StudentResults({ students }: { students: unknown[] }) {
  return (
    <Card title="Students" padded={false}>
      <Table columns={[{ key: 'name', header: 'Name' }, { key: 'roll', header: 'Roll Number' }, { key: 'college', header: 'College ID' }, { key: 'email', header: 'Email' }]}>
        {students.length === 0 ? (
          <TableEmpty colSpan={4} message="No matching students." />
        ) : (
          students.map((item, index) => {
            const row = asRecord(item);
            const user = userOf(row);
            return (
              <TableRow key={resultKey(row, user, 'student', index)}>
                <TableCell className="font-medium text-gray-900">
                  <Link to="/admin/students" className="hover:text-blue-600">
                    {text(user.name, row.name)}
                  </Link>
                </TableCell>
                <TableCell className="text-gray-700">{text(row.rollNumber)}</TableCell>
                <TableCell className="text-gray-700">{text(row.collegeId)}</TableCell>
                <TableCell className="text-gray-500">{text(user.email, row.email)}</TableCell>
              </TableRow>
            );
          })
        )}
      </Table>
    </Card>
  );
}

function FacultyResults({ faculty }: { faculty: unknown[] }) {
  return (
    <Card title="Faculty" padded={false}>
      <Table columns={[{ key: 'name', header: 'Name' }, { key: 'employeeId', header: 'Employee ID' }, { key: 'email', header: 'Email' }, { key: 'designation', header: 'Designation' }]}>
        {faculty.length === 0 ? (
          <TableEmpty colSpan={4} message="No matching faculty." />
        ) : (
          faculty.map((item, index) => {
            const row = asRecord(item);
            const user = userOf(row);
            return (
              <TableRow key={resultKey(row, user, 'faculty', index)}>
                <TableCell className="font-medium text-gray-900">
                  <Link to="/admin/faculty" className="hover:text-blue-600">
                    {text(user.name, row.name)}
                  </Link>
                </TableCell>
                <TableCell className="text-gray-700">{text(row.employeeId)}</TableCell>
                <TableCell className="text-gray-500">{text(user.email, row.email)}</TableCell>
                <TableCell className="text-gray-700">{text(row.designation)}</TableCell>
              </TableRow>
            );
          })
        )}
      </Table>
    </Card>
  );
}

export function GlobalSearch(): JSX.Element {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (opts) =>
      applied === null
        ? Promise.resolve({ students: [] as unknown[], faculty: [] as unknown[] })
        : adminApi.globalSearch(applied, opts),
    [applied]
  );

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setFormError('Enter a search query.');
      return;
    }
    setFormError(null);
    setApplied(trimmed);
  };

  return (
    <>
      <PageHeader title="Global Search" description="Search students and faculty across the portal." />
      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1">
            <Input
              id="search-query"
              label="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, college ID, roll number, or employee ID"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        {formError && (
          <div className="mt-4">
            <Alert variant="error">{formError}</Alert>
          </div>
        )}
      </Card>

      {applied === null && (
        <Card>
          <EmptyState title="Search to find scholars and faculty" message="Enter a query above to begin." />
        </Card>
      )}
      {applied !== null && loading && <SkeletonTable rows={4} columns={4} />}
      {applied !== null && error && !loading && (
        <QueryError error={error} onRetry={() => refetch()} />
      )}
      {applied !== null && !loading && !error && data && (
        <div className="space-y-6">
          <StudentResults students={data.students} />
          <FacultyResults faculty={data.faculty} />
        </div>
      )}
    </>
  );
}

export default GlobalSearch;