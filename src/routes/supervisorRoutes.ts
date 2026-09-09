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
} from '../controllers/supervisorController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate, authorize(UserRole.SUPERVISOR));

router.get('/dashboard', getDashboard);
router.get('/students', getAssignedStudents);
router.get('/students/options', getEligibleStudents);
router.get('/students/:studentId', getStudentDetail);
router.put('/courses/:studentCourseId/approve', approveCourse);
router.put('/thesis/:thesisId/approve', approveThesis);
router.put('/approvals/:requestId/approve', approveRequest);
router.put('/milestones/:id', updateMilestone);
router.post('/events', createEvent);
router.get('/events', getEvents);
router.get('/approvals/pending', getPendingApprovals);

export default router;
