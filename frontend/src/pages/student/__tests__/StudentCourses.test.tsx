// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StudentCourses } from '../StudentCourses';
import { studentApi } from '../../../api/student';
import type { Course, FacultyShort, Semester, StudentProfileView } from '../../../types';

const mockUseAuth = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFaculty: FacultyShort = {
  _id: 'fac-1',
  name: 'Dr. Jane Smith',
  department: 'CSE',
  designation: 'Professor',
};

const mockProfileWithSupervisor: StudentProfileView = {
  _id: 'profile-1',
  user: { id: 'u-1', name: 'Student One', email: 'student1@iitp.ac.in', role: 'student' },
  collegeId: 'COL123',
  rollNumber: '2101CS01',
  studentType: 'frp',
  department: 'CSE',
  researchArea: 'AI / ML',
  admissionDate: '2021-08-01',
  requiredCredits: 60,
  isProfileComplete: true,
  supervisor: mockFaculty,
};

const mockProfileWithoutSupervisor: StudentProfileView = {
  ...mockProfileWithSupervisor,
  supervisor: null,
};

const mockSemesters: Semester[] = [
  {
    _id: 'sem-1',
    student: 'student-1',
    semesterNumber: 1,
    academicYear: '2024-25',
    startDate: '2024-08-01',
    endDate: '2024-12-15',
  },
  {
    _id: 'sem-2',
    student: 'student-1',
    semesterNumber: 2,
    academicYear: '2024-25',
    startDate: '2025-01-05',
    endDate: '2025-05-15',
  },
];

const mockSem1Courses: Course[] = [
  {
    _id: 'course-1',
    semester: 'sem-1',
    courseCode: 'CS601',
    courseName: 'Advanced Algorithms',
    credits: 4,
    status: 'approved',
    supervisorComment: 'Approved for registration',
  },
  {
    _id: 'course-2',
    semester: 'sem-1',
    courseCode: 'CS602',
    courseName: 'Machine Learning',
    credits: 3,
    status: 'pending',
  },
];

const mockSem2Courses: Course[] = [
  {
    _id: 'course-3',
    semester: 'sem-2',
    courseCode: 'CS603',
    courseName: 'Deep Learning',
    credits: 4,
    status: 'approved',
    supervisorComment: 'Approved without remarks',
  },
];

describe('StudentCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u-1', name: 'Student One', email: 'student1@iitp.ac.in', role: 'student' },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. "Request Course" button is NEVER rendered', () => {
    it('does not render "Request Course" button when student has supervisor and semesters', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue(mockSem1Courses);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Courses' })).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: /request course/i })).toBeNull();
      expect(screen.queryByText(/request course/i)).toBeNull();
    });

    it('does not render "Request Course" button when student has supervisor but no semesters', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue([]);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No semesters yet')).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: /request course/i })).toBeNull();
      expect(screen.queryByText(/request course/i)).toBeNull();
    });

    it('does not render "Request Course" button when student has no supervisor', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue([]);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithoutSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'Awaiting supervisor assignment. A supervisor must be assigned by the department before you can register semesters.'
          )
        ).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: /request course/i })).toBeNull();
      expect(screen.queryByText(/request course/i)).toBeNull();
    });
  });

  describe('2. Course table rendering', () => {
    it('renders courses (code, name, credits, status, remarks) for the selected semester', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue(mockSem1Courses);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      // Verify course 1 data
      expect(await screen.findByText('CS601')).toBeTruthy();
      expect(screen.getByText('Advanced Algorithms')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
      expect(screen.getByText('Approved')).toBeTruthy();
      expect(screen.getByText('Remark: Approved for registration')).toBeTruthy();

      // Verify course 2 data
      expect(screen.getByText('CS602')).toBeTruthy();
      expect(screen.getByText('Machine Learning')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('Pending')).toBeTruthy();
    });

    it('renders table empty state when semester has no courses enrolled', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      expect(await screen.findByText('No courses enrolled for this semester.')).toBeTruthy();
    });
  });

  describe('3. Semester dropdown', () => {
    it('allows switching semesters and loads corresponding courses', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      const getCoursesSpy = vi.spyOn(studentApi, 'getCourses').mockImplementation(async (semesterId) => {
        if (semesterId === 'sem-1') return mockSem1Courses;
        if (semesterId === 'sem-2') return mockSem2Courses;
        return [];
      });

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      // Initially loads sem-1 courses
      expect(await screen.findByText('CS601')).toBeTruthy();
      expect(getCoursesSpy).toHaveBeenCalledWith('sem-1', expect.anything());

      // Switch to sem-2 using the Select dropdown
      const select = screen.getByLabelText('Semester');
      fireEvent.change(select, { target: { value: 'sem-2' } });

      // Verifies sem-2 courses are loaded
      expect(await screen.findByText('CS603')).toBeTruthy();
      expect(screen.getByText('Deep Learning')).toBeTruthy();
      expect(screen.queryByText('CS601')).toBeNull();
      expect(getCoursesSpy).toHaveBeenCalledWith('sem-2', expect.anything());
    });
  });

  describe('4. "Add Semester" button in course section toolbar', () => {
    it('opens the Add Semester modal when clicked', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue(mockSem1Courses);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('CS601')).toBeTruthy();
      });

      // The "Add Semester" button is in the card header next to the select
      const addSemesterBtn = screen.getByRole('button', { name: /add semester/i });
      expect(addSemesterBtn).toBeTruthy();

      fireEvent.click(addSemesterBtn);

      // Verify modal opens
      expect(await screen.findByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Semester 3 will be added.')).toBeTruthy();
      expect(screen.getByLabelText(/academic year/i)).toBeTruthy();
      expect(screen.getByLabelText(/start date/i)).toBeTruthy();
      expect(screen.getByLabelText(/end date/i)).toBeTruthy();
    });

    it('does not render "Add Semester" button in course section when profile has no supervisor', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithoutSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue(mockSem1Courses);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('CS601')).toBeTruthy();
      });

      expect(screen.queryByRole('button', { name: /add semester/i })).toBeNull();
    });
  });

  describe('5. Submitting the Add Semester modal', () => {
    it('validates academic year and calls studentApi.createSemester upon submit', async () => {
      const getSemestersSpy = vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue(mockSem1Courses);
      const createSemesterSpy = vi.spyOn(studentApi, 'createSemester').mockResolvedValue({
        _id: 'sem-3',
        student: 'student-1',
        semesterNumber: 3,
        academicYear: '2025-26',
        startDate: '2025-08-01',
        endDate: '2025-12-15',
      });

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('CS601')).toBeTruthy();
      });

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /add semester/i }));
      const dialog = await screen.findByRole('dialog');

      // Click submit without entering academic year
      const submitBtn = within(dialog).getByRole('button', { name: /add semester/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Academic year is required.')).toBeTruthy();
      expect(createSemesterSpy).not.toHaveBeenCalled();

      // Enter form data
      const yearInput = screen.getByLabelText(/academic year/i);
      const startInput = screen.getByLabelText(/start date/i);
      const endInput = screen.getByLabelText(/end date/i);

      fireEvent.change(yearInput, { target: { value: '2025-26' } });
      fireEvent.change(startInput, { target: { value: '2025-08-01' } });
      fireEvent.change(endInput, { target: { value: '2025-12-15' } });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSemesterSpy).toHaveBeenCalledWith({
          semesterNumber: 3,
          academicYear: '2025-26',
          startDate: '2025-08-01',
          endDate: '2025-12-15',
        });
      });

      // Modal closes and refetches semesters
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
      expect(getSemestersSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('6. Empty state and header', () => {
    it('renders clean PageHeader with title and description', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue(mockSemesters);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue(mockSem1Courses);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { level: 1, name: 'Courses' })).toBeTruthy();
      expect(
        screen.getByText('View your enrolled courses and manage your semesters.')
      ).toBeTruthy();
    });

    it('renders EmptyState with Add Semester action when semesterList is empty and supervisor assigned', async () => {
      vi.spyOn(studentApi, 'getSemesters').mockResolvedValue([]);
      vi.spyOn(studentApi, 'getProfile').mockResolvedValue(mockProfileWithSupervisor);
      vi.spyOn(studentApi, 'getCourses').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      expect(await screen.findByText('No semesters yet')).toBeTruthy();
      expect(
        screen.getByText('Add your first semester to start registering courses.')
      ).toBeTruthy();

      const addBtn = screen.getByRole('button', { name: /add semester/i });
      expect(addBtn).toBeTruthy();

      // Clicking opens modal
      fireEvent.click(addBtn);
      const dialog = await screen.findByRole('dialog');
      expect(screen.getByText('Semester 1 will be added.')).toBeTruthy();
      expect(within(dialog).getByRole('button', { name: /add semester/i })).toBeTruthy();
    });
  });

  describe('7. Role protection', () => {
    it('redirects to / when user is not a student', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u-2', name: 'Faculty Member', email: 'faculty@iitp.ac.in', role: 'supervisor' },
      });

      render(
        <MemoryRouter>
          <StudentCourses />
        </MemoryRouter>
      );

      // Should not render PageHeader or content
      expect(screen.queryByText('View your enrolled courses and manage your semesters.')).toBeNull();
    });
  });
});
