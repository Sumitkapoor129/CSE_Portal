// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StudentDocuments } from '../StudentDocuments';
import { studentApi } from '../../../api/student';
import type { DocumentView, StudentProfileView } from '../../../types';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'student', id: 'student-user-1' } }),
}));

describe('StudentDocuments (Semester-wise Document Management)', () => {
  // Use admission date within the current 6-month semester so Semester 1 is the current semester
  const recentAdmissionDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const mockProfile: Partial<StudentProfileView> = {
    _id: 'prof-1',
    admissionDate: recentAdmissionDate,
  };

  const mockDocs: DocumentView[] = [
    {
      _id: 'doc-1',
      student: 'prof-1',
      documentName: 'Synopsis Report',
      documentType: 'Report',
      fileUrl: '/uploads/documents/synopsis.pdf',
      semesterNumber: 1,
      uploadedBy: 'student-user-1',
      uploadDate: new Date().toISOString(),
      approvalStatus: 'approved',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfile as StudentProfileView);
    vi.spyOn(studentApi, 'getDocuments').mockResolvedValue(mockDocs);
    vi.spyOn(studentApi, 'getForms').mockResolvedValue([]);
  });

  afterEach(cleanup);

  it('renders semesters dynamically from admissionDate with current semester open by default', async () => {
    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    expect(await screen.findByText('Semester 1')).toBeTruthy();
    expect(screen.getByText('Current Semester')).toBeTruthy();
    expect(screen.getByText('1 document')).toBeTruthy();
    expect(screen.getByText('Synopsis Report')).toBeTruthy();
  });

  it('calculates multiple semesters when student was admitted earlier', async () => {
    // Admitted ~14 months ago -> currently in Semester 3
    const olderAdmissionDate = new Date(Date.now() - 420 * 24 * 60 * 60 * 1000).toISOString();
    vi.spyOn(studentApi, 'getProfile').mockResolvedValueOnce({
      ...mockProfile,
      admissionDate: olderAdmissionDate,
    } as StudentProfileView);

    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    expect(await screen.findByText('Semester 1')).toBeTruthy();
    expect(screen.getByText('Semester 2')).toBeTruthy();
    expect(screen.getByText('Semester 3')).toBeTruthy();
  });

  it('displays document details within expanded semester and allows preview and download', async () => {
    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    expect(await screen.findByText('Synopsis Report')).toBeTruthy();
    expect(screen.getByText('Report')).toBeTruthy();

    const openLink = screen.getByRole('link', { name: /open/i });
    expect(openLink.getAttribute('href')).toBe('/uploads/documents/synopsis.pdf');
    expect(openLink.getAttribute('target')).toBe('_blank');

    const downloadLink = screen.getByRole('link', { name: /download/i });
    expect(downloadLink.getAttribute('href')).toBe('/uploads/documents/synopsis.pdf');
  });

  it('allows expanding and collapsing semester accordions', async () => {
    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    await screen.findByText('Semester 1');
    expect(screen.getByText('Synopsis Report')).toBeTruthy();

    // Toggle semester 1 accordion to collapse
    const semButton = screen.getByRole('button', { name: /Semester 1/i });
    fireEvent.click(semButton);

    // Should be collapsed
    expect(screen.queryByText('Synopsis Report')).toBeNull();

    // Click again to expand
    fireEvent.click(semButton);
    expect(await screen.findByText('Synopsis Report')).toBeTruthy();
  });

  it('opens upload modal and pre-selects the semester', async () => {
    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    await screen.findByText('Semester 1');

    // Click top Upload Document button
    const uploadBtn = screen.getByRole('button', { name: 'Upload Document' });
    fireEvent.click(uploadBtn);

    expect(await screen.findByRole('heading', { name: 'Upload Document' })).toBeTruthy();
    expect(screen.getByLabelText(/document name/i)).toBeTruthy();
    expect(screen.getByLabelText(/^semester$/i)).toBeTruthy();
    expect(screen.getByLabelText(/file upload/i)).toBeTruthy();
  });

  it('uploads document via file upload API', async () => {
    const uploadFileSpy = vi.spyOn(studentApi, 'uploadDocumentFile').mockResolvedValueOnce({
      _id: 'doc-new',
      student: 'prof-1',
      documentName: 'Progress Review',
      documentType: 'Report',
      fileUrl: '/uploads/documents/progress.pdf',
      semesterNumber: 1,
      uploadedBy: 'student-user-1',
      uploadDate: new Date().toISOString(),
      approvalStatus: 'pending',
    });

    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    await screen.findByText('Semester 1');

    fireEvent.click(screen.getByRole('button', { name: 'Upload Document' }));
    await screen.findByRole('heading', { name: 'Upload Document' });

    // Fill form
    fireEvent.change(screen.getByLabelText(/document name/i), { target: { value: 'Progress Review' } });
    fireEvent.change(screen.getByLabelText(/document type/i), { target: { value: 'Report' } });

    const file = new File(['dummy content'], 'progress.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/file upload/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload document' }));

    await waitFor(() => {
      expect(uploadFileSpy).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Document uploaded successfully.')).toBeTruthy();
  });

  it('uploads document via fileUrl fallback API', async () => {
    const uploadDocSpy = vi.spyOn(studentApi, 'uploadDocument').mockResolvedValueOnce({
      _id: 'doc-url',
      student: 'prof-1',
      documentName: 'External Cert',
      documentType: 'Certificate',
      fileUrl: 'https://example.com/cert.pdf',
      semesterNumber: 1,
      uploadedBy: 'student-user-1',
      uploadDate: new Date().toISOString(),
      approvalStatus: 'pending',
    });

    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    await screen.findByText('Semester 1');

    fireEvent.click(screen.getByRole('button', { name: 'Upload Document' }));
    await screen.findByRole('heading', { name: 'Upload Document' });

    fireEvent.change(screen.getByLabelText(/document name/i), { target: { value: 'External Cert' } });
    fireEvent.change(screen.getByLabelText(/document type/i), { target: { value: 'Certificate' } });
    fireEvent.change(screen.getByLabelText(/file url/i), { target: { value: 'https://example.com/cert.pdf' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload document' }));

    await waitFor(() => {
      expect(uploadDocSpy).toHaveBeenCalledWith({
        documentName: 'External Cert',
        documentType: 'Certificate',
        fileUrl: 'https://example.com/cert.pdf',
        semesterNumber: 1,
      });
    });

    expect(await screen.findByText('Document uploaded successfully.')).toBeTruthy();
  });

  it('opens delete confirmation modal and deletes document on confirm', async () => {
    const deleteSpy = vi.spyOn(studentApi, 'deleteDocument').mockResolvedValueOnce({
      message: 'Deleted successfully',
    });

    render(
      <MemoryRouter>
        <StudentDocuments />
      </MemoryRouter>
    );

    await screen.findByText('Synopsis Report');

    const deleteBtn = screen.getByRole('button', { name: /delete document/i });
    fireEvent.click(deleteBtn);

    // ConfirmModal should appear
    expect(await screen.findByRole('heading', { name: 'Delete Document' })).toBeTruthy();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeTruthy();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'Delete Document' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('doc-1');
    });

    expect(await screen.findByText('Document deleted successfully.')).toBeTruthy();
  });
});
