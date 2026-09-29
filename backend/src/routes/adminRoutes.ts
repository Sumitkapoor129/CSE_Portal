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
  listForms,
  createForm,
  updateForm,
  deleteForm,
  globalSearch,
  getStudentMilestones,
  updateMilestone,
  getDepartmentDues,
  listExternalExaminers,
  addExternalExaminer,
  updateExternalExaminer,
  listAllInternships,
  adminReviewInternship,
  getStudentCourses,
  addStudentCourse,
  updateStudentCourse,
  deleteStudentCourse,
} from '../controllers/adminController';
import { downloadTemplate, bulkImport, upload } from '../controllers/bulkImportController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate as any, authorize(UserRole.ADMIN) as any);

router.get('/dashboard', getDashboard);
router.get('/dues', getDepartmentDues);

router.post('/students', createStudent);
router.get('/students', listStudents);
router.get('/students/:id/milestones', getStudentMilestones);
router.put('/students/:id', updateStudent);
router.put('/students/:id/toggle-active', toggleStudentActive);

// Admin Direct Student Course Management
router.get('/students/:studentId/courses', getStudentCourses);
router.post('/students/:studentId/courses', addStudentCourse);
router.put('/students/:studentId/courses/:studentCourseId', updateStudentCourse);
router.delete('/students/:studentId/courses/:studentCourseId', deleteStudentCourse);

router.post('/faculty', createFaculty);
router.get('/faculty', listFaculty);
router.put('/faculty/:id', updateFaculty);
router.put('/faculty/:id/toggle-active', toggleFacultyActive);

router.post('/supervisor/assign', assignSupervisor);

router.post('/src-committee', createSRCCommittee);
router.put('/src-committee/:id', updateSRCCommittee);

router.put('/milestones/:id', updateMilestone);

router.get('/forms', listForms);
router.post('/forms', createForm);
router.put('/forms/:id', updateForm);
router.delete('/forms/:id', deleteForm);

router.get('/bulk-import/template/:type', downloadTemplate);
router.post('/bulk-import/:type', upload.single('file'), bulkImport);

router.get('/search', globalSearch);

router.get('/examiners', listExternalExaminers);
router.post('/examiners', addExternalExaminer);
router.put('/examiners/:id', updateExternalExaminer);

router.get('/internships', listAllInternships);
router.put('/internships/:id/review', adminReviewInternship);

export default router;
