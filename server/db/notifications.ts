import { db } from './index';
import * as schema from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { Notification, InsertNotification } from '@shared/schema';

export async function getNotifications(): Promise<Notification[]> {
  return db.select().from(schema.notifications);
}

export async function getNotification(id: number): Promise<Notification | undefined> {
  const notifications = await db.select()
    .from(schema.notifications)
    .where(eq(schema.notifications.id, id))
    .limit(1);
  return notifications[0];
}

export async function getNotificationsByUser(userId: string): Promise<Notification[]> {
  return db.select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt));
}

export async function getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
  return db.select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      )
    )
    .orderBy(desc(schema.notifications.createdAt));
}

export async function createNotification(notificationData: InsertNotification): Promise<Notification> {
  const [notification] = await db.insert(schema.notifications)
    .values({
      ...notificationData,
      isRead: false,
      createdAt: new Date(),
    })
    .returning();
  return notification;
}

export async function markNotificationAsRead(id: number): Promise<Notification | undefined> {
  const [notification] = await db.update(schema.notifications)
    .set({ isRead: true })
    .where(eq(schema.notifications.id, id))
    .returning();
  return notification;
}

export async function deleteNotification(id: number): Promise<boolean> {
  const result = await db.delete(schema.notifications)
    .where(eq(schema.notifications.id, id));
  return (result.rowCount || 0) > 0;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await db.update(schema.notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      )
    );
}
