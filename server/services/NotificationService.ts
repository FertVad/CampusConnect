export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type?: 'task_update' | 'task_assigned' | 'system' | 'reminder';
  relatedId?: number;
  relatedType?: 'task' | 'user' | 'project';
}

import { Notification } from '@shared/schema';
import * as notificationQueries from '../db/notifications';
import { logger } from '../utils/logger';

export class NotificationService {
  static async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      const notification = await notificationQueries.createNotification({
        userId: data.userId,
        title: data.title,
        content: data.message,
        type: data.type ?? 'system',
        relatedId: data.relatedId,
        relatedType: data.relatedType,
        createdAt: new Date(),
      });
      logger.info(`[INFO] Notification created: ${notification.title} for user ${data.userId}`);
      return notification;
    } catch (error) {
      logger.error('[ERROR] Failed to create notification:', error);
      throw error;
    }
  }
}
