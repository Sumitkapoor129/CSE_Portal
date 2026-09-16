import express from 'express';
import { errorHandler } from '../middleware/errorHandler';
import authRoutes from '../routes/authRoutes';
import studentRoutes from '../routes/studentRoutes';
import supervisorRoutes from '../routes/supervisorRoutes';
import adminRoutes from '../routes/adminRoutes';

const testApp = express();

testApp.use(express.json({ limit: '10mb' }));
testApp.use('/api/auth', authRoutes);
testApp.use('/api/student', studentRoutes);
testApp.use('/api/supervisor', supervisorRoutes);
testApp.use('/api/admin', adminRoutes);
testApp.use(errorHandler);

export { testApp };