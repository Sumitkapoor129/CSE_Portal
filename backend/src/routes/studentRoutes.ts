import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getSemesters,
  createSemester,
  getCourses,
  addCourse,
  getCredits,
  getDocuments,
  uploadDocument,
  getThesis,
  submitThesis,
  getTimeline,
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  getDashboard,
  getMyEvents,
  getMyDeadlines,
  getMyForms,
  getMyMilestones,
  getMilestoneTimeline,
  completeMilestone,
  updateMyMilestoneDate,
  getMyInternships,
  createInternshipRequest,
  getMyComprehensiveExams,
} from '../controllers/studentController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate, authorize(UserRole.STUDENT));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/semesters', getSemesters);
router.post('/semesters', createSemester);

router.get('/semesters/:semesterId/courses', getCourses);
router.post('/semesters/:semesterId/courses', addCourse);

router.get('/credits', getCredits);

router.get('/documents', getDocuments);
router.post('/documents', uploadDocument);

router.get('/thesis', getThesis);
router.post('/thesis', submitThesis);

router.get('/timeline', getTimeline);

router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadNotificationsCount);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);

router.get('/dashboard', getDashboard);
router.get('/events', getMyEvents);
router.get('/deadlines', getMyDeadlines);
router.get('/forms', getMyForms);
router.get('/milestones', getMyMilestones);
router.get('/milestones/timeline', getMilestoneTimeline);
router.put('/milestones/:id/complete', completeMilestone);
router.put('/milestones/:id', updateMyMilestoneDate);

router.get('/internships', getMyInternships);
router.post('/internships', createInternshipRequest);

router.get('/comprehensive-exams', getMyComprehensiveExams);

export default router;
