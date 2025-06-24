import { Express } from "express";
import { getStorage } from "../storage";
import { asyncHandler } from "../middleware/errorHandler";
import type { RouteContext } from "./index";

export function registerActivityLogRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
  // Activity Logs Endpoints
  app.get(
    '/api/activity-logs',
    authenticateUser,
    requireRole(['admin']),
    asyncHandler(async (req, res) => {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogs(limit);
      res.json(logs);
    })
  );

  app.get(
    '/api/activity-logs/type/:type',
    authenticateUser,
    requireRole(['admin']),
    asyncHandler(async (req, res) => {
      const type = req.params.type;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogsByType(type, limit);
      res.json(logs);
    })
  );

  app.get(
    '/api/activity-logs/user/:userId',
    authenticateUser,
    requireRole(['admin']),
    asyncHandler(async (req, res) => {
      const userId = req.params.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogsByUser(userId, limit);
      res.json(logs);
    })
  );
}
