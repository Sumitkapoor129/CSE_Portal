import express from 'express';
import { errorHandler } from '../middleware/errorHandler';
import authRoutes from '../routes/authRoutes';
import studentRoutes from '../routes/studentRoutes';

const testApp = express();

testApp.use(express.json({ limit: '10mb' }));
testApp.use('/api/auth', authRoutes);
testApp.use('/api/student', studentRoutes);
testApp.use(errorHandler);

export { testApp };