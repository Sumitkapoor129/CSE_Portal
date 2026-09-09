import { Notification } from '../models/Notification';
import { INotification } from '../types';

export const createNotification = async (params: {
  user: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}): Promise<INotification> => {
  return Notification.create(params);
};

export const createBulkNotifications = async (
  userIds: string[],
  params: { title: string; message: string; type: string; link?: string }
): Promise<void> => {
  const notifications = userIds.map((userId) => ({
    user: userId,
    ...params,
  }));
  await Notification.insertMany(notifications);
};
