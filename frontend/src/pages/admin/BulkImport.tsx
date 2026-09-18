import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';
import { PageHeader } from '../../components/shared/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/shared/StatCard';
import { Table, TableCell, TableEmpty, TableRow } from '../../components/ui/Table';
import { IMPORT_FAILURE_STYLE, IMPORT_SUCCESS_STYLE } from '../../utils/constants';
import type { BulkImportReport, BulkImportType } from '../../types';

const IMPORT_OPTIONS: { value: BulkImportType; label: string; description: string }[] = [
  { value: 'students', label: 'Students', description: 'Create scholar accounts with profile details, milestone progress, and history.' },
  { value: 'faculty', label: 'Faculty', description: 'Create faculty / supervisor accounts with employee and research details.' },
  { value: 'events', label: 'Events', description: 'Create events and enroll existing students & faculty as participants.' },
];

const COLUMN_COUNTS: Record<BulkImportType, number> = { students: 39, faculty: 7, events: 8 };

export function BulkImport(): JSX.Element {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [type, setType] = useState<BulkImportType>(() => {
    const raw = searchParams.get('type');
    return raw === 'faculty' || raw === 'events' ? raw : 'students';
  });
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [report, setReport] = useState<BulkImportReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report) {
      resultsRef.current?.focus();
    }
  }, [report]);

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  const selectedOption = IMPORT_OPTIONS.find((o) => o.value === type) ?? IMPORT_OPTIONS[0];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !/\.(csv|xlsx|xls)$/i.test(selected.name)) {
      setError('Please select a CSV or Excel (.xlsx / .xls) file.');
      setFile(null);
      return;
    }
    setError(null);
    setReport(null);
    setFile(selected);
  };

  const handleTemplateDownload = async () => {
    try {
      setError(null);
      const blob = await adminApi.downloadBulkImportTemplate(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_import_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess(`Template for ${selectedOption.label.toLowerCase()} downloaded. It includes an Instructions sheet describing each column.`);
    } catch {
      setError('Unable to download the template. Please try again.');
    }
  };

  const handleImport = async () => {
    if (!file || importing) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    setReport(null);
    try {
      const result = await adminApi.bulkImport(type, file);
      setReport(result);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      if (result.failed === 0) {
        setSuccess(`${result.succeeded} record${result.succeeded === 1 ? '' : 's'} imported successfully.`);
      } else {
        setError(`${result.failed} record${result.failed === 1 ? '' : 's'} failed to import. See details below.`);
      }
    } catch {
      setError('Unable to process the file. Please check the file format and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Bulk Import"
        description="Import students, faculty, or events in bulk from a CSV or Excel file."
      />

      {success && (
        <div className="mb-6">
          <Alert variant="success" onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-6">
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      <Card title="Choose Import Type" className="mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {IMPORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={type === option.value}
              onClick={() => {
                setType(option.value);
                setReport(null);
                setError(null);
                setFile(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className={`rounded-md border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                type === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-semibold text-gray-900">{option.label}</div>
              <div className="mt-1 text-xs text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Upload File" className="mb-6">
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900">Need the required columns?</h3>
          <p className="mt-1 text-sm text-gray-600">
            Download the template first. It has an <span className="font-medium">Instructions</span> sheet that
            lists every column, whether it is required, and what value to put in it ({COLUMN_COUNTS[type]} columns in total).
          </p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={handleTemplateDownload}>
            Download {selectedOption.label} Template (.xlsx)
          </Button>
        </div>

        <div>
          <label
            htmlFor="bulk-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition-colors hover:border-gray-400 hover:bg-gray-100 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
          >
            <input
              id="bulk-file"
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              onChange={handleFileChange}
            />
            <div className="text-sm font-medium text-gray-700">
              {file ? file.name : 'Click to choose a CSV or Excel file'}
            </div>
            {file && <div className="mt-1 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>}
            {!file && <div className="mt-1 text-xs text-gray-500">CSV, .xlsx or .xls — max 10 MB</div>}
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? 'Importing…' : `Import ${selectedOption.label}`}
          </Button>
          {file && (
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setReport(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {report && (
        <div ref={resultsRef} tabIndex={-1} className="scroll-mt-24 outline-none">
          <Card title="Import Results" padded={false}>
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <StatCard label="Total rows" value={report.total} sub="Rows detected in file" />
              <StatCard label="Imported" value={<span className="text-green-600">{report.succeeded}</span>} sub="Successfully created" />
              <StatCard label="Failed" value={<span className="text-red-600">{report.failed}</span>} sub="Rejected rows" />
            </div>
            {report.failed > 0 && (
              <Table
                ariaLabel="Import results"
                columns={[
                  { key: 'row', header: 'Row' },
                  { key: 'status', header: 'Status' },
                  { key: 'name', header: 'Name' },
                  { key: 'email', header: 'Email' },
                  { key: 'error', header: 'Reason' },
                ]}
              >
                {report.rows.length === 0 ? (
                  <TableEmpty colSpan={5} message="No rows to display." />
                ) : (
                  report.rows.map((row) => (
                    <TableRow key={`${row.row}-${row.email ?? 'e'}`}>
                      <TableCell className="text-gray-500">{row.row}</TableCell>
                      <TableCell>
                        {row.status === 'success' ? (
                          <Badge label="Imported" className={IMPORT_SUCCESS_STYLE} />
                        ) : (
                          <Badge label="Failed" className={IMPORT_FAILURE_STYLE} />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{row.name ?? '—'}</TableCell>
                      <TableCell className="text-gray-700">{row.email ?? '—'}</TableCell>
                      <TableCell className="text-gray-700">{row.error ?? ''}</TableCell>
                    </TableRow>
                  ))
                )}
              </Table>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

export default BulkImport;