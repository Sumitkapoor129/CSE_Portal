import { Router } from 'express';
import {
  getDashboard,
  createStudent,
  updateStudent,
  toggleStudentActive,
  listStudents,
  createFaculty,
  updateFaculty,
  toggleFacultyActive,
  listFaculty,
  assignSupervisor,
  createSRCCommittee,
  updateSRCCommittee,
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  listForms,
  createForm,
  updateForm,
  deleteForm,
  listDeadlines,
  createDeadline,
  globalSearch,
  getStudentMilestones,
  updateMilestone,
} from '../controllers/adminController';
import { downloadTemplate, bulkImport, upload } from '../controllers/bulkImportController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate as any, authorize(UserRole.ADMIN) as any);

router.get('/dashboard', getDashboard);

router.post('/students', createStudent);
router.get('/students', listStudents);
router.get('/students/:id/milestones', getStudentMilestones);
router.put('/students/:id', updateStudent);
router.put('/students/:id/toggle-active', toggleStudentActive);

router.post('/faculty', createFaculty);
router.get('/faculty', listFaculty);
router.put('/faculty/:id', updateFaculty);
router.put('/faculty/:id/toggle-active', toggleFacultyActive);

router.post('/supervisor/assign', assignSupervisor);

router.post('/src-committee', createSRCCommittee);
router.put('/src-committee/:id', updateSRCCommittee);

router.put('/milestones/:id', updateMilestone);

router.post('/events', createEvent);
router.get('/events', listEvents);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

router.get('/forms', listForms);
router.post('/forms', createForm);
router.put('/forms/:id', updateForm);
router.delete('/forms/:id', deleteForm);

router.get('/deadlines', listDeadlines);
router.post('/deadlines', createDeadline);

router.get('/bulk-import/template/:type', downloadTemplate);
router.post('/bulk-import/:type', upload.single('file'), bulkImport);

router.get('/search', globalSearch);

export default router;
