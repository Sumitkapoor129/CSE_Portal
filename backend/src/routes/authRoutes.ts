import { Router } from 'express';
import { registerStudent, verifyOTP, login, getMe, changePassword, refreshToken, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', registerStudent);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;
