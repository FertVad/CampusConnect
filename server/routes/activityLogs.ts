import { Express } from "express";
import { getStorage } from "../storage";
import type { RouteContext } from "./index";

export function registerActivityLogRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
  // Activity Logs Endpoints
  app.get('/api/activity-logs', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogs(limit);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/activity-logs/type/:type', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const type = req.params.type;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogsByType(type, limit);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/activity-logs/user/:userId', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogsByUser(userId, limit);
      res.json(logs);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });
}
