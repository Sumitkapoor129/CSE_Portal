import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { QueryError } from '../../components/shared/QueryError';
import { Card } from '../../components/ui/Card';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import type { Credits, CreditsListResponse } from '../../types';

function isCreditsListResponse(value: CreditsListResponse | Credits | null): value is CreditsListResponse {
  return value !== null && 'semesters' in value;
}

export function StudentCredits(): JSX.Element {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(studentApi.getCredits);
  const { data: profile } = useApi(studentApi.getProfile);
  const { data: semesters } = useApi(studentApi.getSemesters);

  if (user?.role !== 'student') return <Navigate to="/" replace />;

  const semesterList = semesters ?? [];
  const byId = new Map(semesterList.map((semester) => [semester._id, semester] as [string, typeof semester]));
  type CreditsResult = CreditsListResponse | Credits;
  const value = data as CreditsResult | null;
  const list = isCreditsListResponse(value) ? (value as CreditsListResponse) : null;
  const single = value && !list ? (value as Credits) : null;
  const rows: Credits[] = list ? list.semesters : single ? [single] : [];
  const totalEarned = list ? list.totalEarnedCredits : single ? single.earnedCredits : 0;
  const required = profile?.requiredCredits ?? (single ? single.requiredCredits : null);
  const remaining = required !== null ? Math.max(0, required - totalEarned) : null;

  return (
    <>
      <PageHeader title="Credits" description="Track your earned coursework credits against your requirement." />
      {loading && (
        <div className="space-y-6">
          <SkeletonCards count={3} />
          <SkeletonTable rows={4} />
        </div>
      )}
      {error && !loading && <QueryError error={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm font-medium text-gray-500">Total earned</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{totalEarned}</p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-gray-500">Required</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{required ?? '—'}</p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{remaining ?? '—'}</p>
            </Card>
          </div>

          <Card title="Credits by semester" padded={false}>
            <Table
              columns={[
                { key: 'semester', header: 'Semester' },
                { key: 'year', header: 'Academic Year' },
                { key: 'earned', header: 'Earned Credits' },
              ]}
            >
              {rows.length === 0 ? (
                <TableEmpty colSpan={3} message="No credits recorded yet." />
              ) : (
                rows.map((credit) => {
                  const semester = typeof credit.semester === 'object' ? credit.semester : byId.get(credit.semester);
                  return (
                    <TableRow key={credit._id}>
                      <TableCell className="font-medium text-gray-900">
                        {semester ? `Semester ${semester.semesterNumber}` : '—'}
                      </TableCell>
                      <TableCell className="text-gray-700">{semester?.academicYear ?? '—'}</TableCell>
                      <TableCell className="text-gray-700">{credit.earnedCredits}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}

export default StudentCredits;