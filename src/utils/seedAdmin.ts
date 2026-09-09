import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { UserRole } from '../types';
import { env } from '../config/env';

export const seedAdmin = async (): Promise<void> => {
  try {
    const existingAdmin = await User.findOne({ role: UserRole.ADMIN });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await User.create({
      email: env.ADMIN_EMAIL,
      password: hashedPassword,
      role: UserRole.ADMIN,
      name: env.ADMIN_NAME,
      isActive: true,
    });

    console.log('Admin user seeded successfully');
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};
