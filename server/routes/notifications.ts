import { Express } from "express";
import { getStorage } from "../storage";
import type { RouteContext } from "./index";
import { z } from "zod";

// Validation schema for creating notifications
const createNotificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(255),
  message: z.string().optional(),
  type: z.enum(["task_assigned", "task_updated", "general"]).default("general"),
  taskId: z.string().optional(),
});

export function registerNotificationRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
  // GET /api/notifications
  app.get('/api/notifications', authenticateUser, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await getStorage().getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        message: 'Failed to fetch notifications',
        error: (error as Error).message,
      });
    }
  });

  app.get('/api/notifications/unread', authenticateUser, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await getStorage().getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete('/api/notifications/:id', authenticateUser, async (req, res) => {
    try {
      const notificationId = req.params.id;
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      const userId = req.user!.id;
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this notification" });
      }
      const success = await getStorage().deleteNotification(notificationId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete notification" });
      }
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/notifications', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const validatedData = createNotificationSchema.parse(req.body);
      const notification = await getStorage().createNotification({
        userId: validatedData.userId,
        title: validatedData.title,
        content: validatedData.message ?? '',
        relatedId: validatedData.taskId,
        relatedType: validatedData.type,
      });
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    try {
      const notificationId = req.params.id;
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      const userId = req.user!.id;
      if (userId !== notification.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updatedNotification = await getStorage().markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch('/api/notifications/read-all', authenticateUser, async (req, res) => {
    try {
      const userId = req.user!.id;
      await getStorage().markAllNotificationsAsRead(userId);
      res.json({ success: true, message: "All notifications marked as read" });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/notifications/user/:userId', authenticateUser, async (req, res) => {
    try {
      const userId = req.params.userId;
      const currentUserId = req.user!.id;
      if (currentUserId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const notifications = await getStorage().getNotificationsByUser(userId);
      res.json(notifications);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/notifications/unread/user/:userId', authenticateUser, async (req, res) => {
    try {
      const userId = req.params.userId;
      const currentUserId = req.user!.id;
      if (currentUserId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const notifications = await getStorage().getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });
}
