import { Express } from "express";
import { getStorage } from "../storage";
import type { RouteContext } from "./index";
import { z } from "zod";

export function registerNotificationRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
  // GET /api/notifications
  app.get('/api/notifications', authenticateUser, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await getStorage().getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Notifications error:', error);
      return res.json([]);
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

  app.post('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      if (notification.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to modify this notification" });
      }
      const updatedNotification = await getStorage().markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete('/api/notifications/:id', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      if (notification.userId !== req.user!.id) {
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
      const { userId, title, content, relatedId, relatedType } = req.body;
      if (!userId || !title || !content) {
        return res.status(400).json({ message: "userId, title and content are required" });
      }
      const notificationData = { userId, title, content, relatedId, relatedType };
      const notification = await getStorage().createNotification(notificationData);
      res.status(201).json(notification);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      if (req.user!.id !== notification.userId) {
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
      const userId = parseInt(req.params.userId);
      if (req.user!.id !== userId) {
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
      const userId = parseInt(req.params.userId);
      if (req.user!.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const notifications = await getStorage().getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });
}
