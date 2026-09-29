import { Router } from 'express';
import {
  getDashboard,
  getAssignedStudents,
  getStudentDetail,
  getEligibleStudents,
  approveCourse,
  approveThesis,
  approveRequest,
  createEvent,
  getEvents,
  getPendingApprovals,
  updateMilestone,
  getAssignedScholarsDues,
  recordComprehensiveExamResult,
  getStudentComprehensiveExams,
  listScholarInternships,
  reviewInternship,
} from '../controllers/supervisorController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate, authorize(UserRole.SUPERVISOR));

router.get('/dashboard', getDashboard);
router.get('/dues', getAssignedScholarsDues);
router.get('/students', getAssignedStudents);
router.get('/students/options', getEligibleStudents);
router.get('/students/:studentId', getStudentDetail);
router.get('/students/:studentId/comprehensive-exams', getStudentComprehensiveExams);
router.put('/courses/:studentCourseId/approve', approveCourse);
router.put('/thesis/:thesisId/approve', approveThesis);
router.put('/approvals/:requestId/approve', approveRequest);
router.put('/milestones/:id', updateMilestone);
router.post('/events', createEvent);
router.get('/events', getEvents);
router.get('/approvals/pending', getPendingApprovals);

router.post('/comprehensive-exam', recordComprehensiveExamResult);
router.get('/internships', listScholarInternships);
router.put('/internships/:id/review', reviewInternship);

export default router;
