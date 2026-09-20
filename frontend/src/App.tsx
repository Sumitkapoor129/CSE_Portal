import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePageTitle } from './hooks/usePageTitle';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Skeleton } from './components/ui/Skeleton';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const StudentMilestones = lazy(() => import('./pages/student/StudentMilestones'));
const StudentCourses = lazy(() => import('./pages/student/StudentCourses'));
const StudentCredits = lazy(() => import('./pages/student/StudentCredits'));
const StudentThesis = lazy(() => import('./pages/student/StudentThesis'));
const StudentEvents = lazy(() => import('./pages/student/StudentEvents'));
const StudentDeadlines = lazy(() => import('./pages/student/StudentDeadlines'));
const StudentDocuments = lazy(() => import('./pages/student/StudentDocuments'));
const StudentNotifications = lazy(() => import('./pages/student/StudentNotifications'));
const StudentOnboarding = lazy(() => import('./pages/student/StudentOnboarding'));
const SupervisorDashboard = lazy(() => import('./pages/supervisor/SupervisorDashboard'));
const StudentList = lazy(() => import('./pages/supervisor/StudentList'));
const StudentDetail = lazy(() => import('./pages/supervisor/StudentDetail'));
const Approvals = lazy(() => import('./pages/supervisor/Approvals'));
const SupervisorEvents = lazy(() => import('./pages/supervisor/SupervisorEvents'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const StudentManagement = lazy(() => import('./pages/admin/StudentManagement'));
const FacultyManagement = lazy(() => import('./pages/admin/FacultyManagement'));
const SupervisorAssignment = lazy(() => import('./pages/admin/SupervisorAssignment'));
const SrcCommitteeManagement = lazy(() => import('./pages/admin/SrcCommitteeManagement'));
const FormManagement = lazy(() => import('./pages/admin/FormManagement'));
const DeadlineManagement = lazy(() => import('./pages/admin/DeadlineManagement'));
const EventManagement = lazy(() => import('./pages/admin/EventManagement'));
const GlobalSearch = lazy(() => import('./pages/admin/GlobalSearch'));
const BulkImport = lazy(() => import('./pages/admin/BulkImport'));

const ROUTE_TITLES: Record<string, string> = {
  '/auth/login': 'Sign In',
  '/auth/register': 'Register',
  '/auth/verify-otp': 'Verify OTP',
  '/student': 'Dashboard',
  '/student/profile': 'Profile',
  '/student/milestones': 'Milestones',
  '/student/courses': 'My Courses',
  '/student/credits': 'Credits',
  '/student/thesis': 'Thesis',
  '/student/events': 'Events',
  '/student/deadlines': 'Deadlines',
  '/student/documents': 'Documents',
  '/student/notifications': 'Notifications',
  '/student/complete-profile': 'Complete Profile',
  '/supervisor': 'Dashboard',
  '/supervisor/students': 'Assigned Students',
  '/supervisor/approvals': 'Approvals',
  '/supervisor/events': 'Events',
  '/admin': 'Dashboard',
  '/admin/students': 'Student Management',
  '/admin/faculty': 'Faculty Management',
  '/admin/bulk-import': 'Bulk Import',
  '/admin/assignments': 'Supervisor Assignments',
  '/admin/src-committees': 'SRC Committee',
  '/admin/forms': 'Form Builder',
  '/admin/deadlines': 'Deadline Management',
  '/admin/events': 'Event Management',
  '/admin/search': 'Global Search',
};

function getRouteTitle(pathname: string): string {
  for (const [path, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + '/')) return title;
  }
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/') return '';
  return '';
}

function DocumentTitle() {
  const { pathname } = useLocation();
  usePageTitle(getRouteTitle(pathname));
  return null;
}

function Root() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth/login" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  if (user.role === 'supervisor') return <Navigate to="/supervisor" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <DocumentTitle />
            <Routes>
              <Route path="/" element={<Root />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/verify-otp" element={<VerifyOtpPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/student" element={<ProtectedRoute roles={['student']} />}>
                    <Route index element={<StudentDashboard />} />
                    <Route path="profile" element={<StudentProfile />} />
                    <Route path="milestones" element={<StudentMilestones />} />
                    <Route path="courses" element={<StudentCourses />} />
                    <Route path="credits" element={<StudentCredits />} />
                    <Route path="thesis" element={<StudentThesis />} />
                    <Route path="events" element={<StudentEvents />} />
                    <Route path="deadlines" element={<StudentDeadlines />} />
                    <Route path="documents" element={<StudentDocuments />} />
                    <Route path="notifications" element={<StudentNotifications />} />
                    <Route path="complete-profile" element={<StudentOnboarding />} />
                    <Route path="onboarding" element={<Navigate to="/student/complete-profile" replace />} />
                  </Route>
                  <Route path="/supervisor" element={<ProtectedRoute roles={['supervisor']} />}>
                    <Route index element={<SupervisorDashboard />} />
                    <Route path="students" element={<StudentList />} />
                    <Route path="students/:studentId" element={<StudentDetail />} />
                    <Route path="approvals" element={<Approvals />} />
                    <Route path="events" element={<SupervisorEvents />} />
                  </Route>
                  <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="students" element={<StudentManagement />} />
                    <Route path="faculty" element={<FacultyManagement />} />
                    <Route path="assignments" element={<SupervisorAssignment />} />
                    <Route path="src-committees" element={<SrcCommitteeManagement />} />
                    <Route path="forms" element={<FormManagement />} />
                    <Route path="deadlines" element={<DeadlineManagement />} />
                    <Route path="events" element={<EventManagement />} />
                    <Route path="bulk-import" element={<BulkImport />} />
                    <Route path="search" element={<GlobalSearch />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
