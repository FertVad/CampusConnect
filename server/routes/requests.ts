import { Express } from "express";
import { getStorage } from "../storage";
import { insertRequestSchema } from "@shared/schema";
import { z } from "zod";
import type { RouteContext } from "./index";

export function registerRequestRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
  // Request Routes
  app.get('/api/requests', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const requests = await getStorage().getRequests();
      res.json(requests);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/requests/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = req.params.studentId;
      if (req.user!.id !== studentId && req.user!.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const requests = await getStorage().getRequestsByStudent(studentId);
      res.json(requests);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/requests', authenticateUser, requireRole(['student']), async (req, res) => {
    try {
      const requestData = insertRequestSchema.parse({
        ...req.body,
        studentId: req.user!.id
      });

      const request = await getStorage().createRequest(requestData);

      const admins = (await getStorage().getUsers()).filter(user => user.role === 'admin');
      if (req.user) {
        for (const admin of admins) {
          await getStorage().createNotification({
            userId: admin.id,
            title: "New Student Request",
            content: `${req.user.firstName} ${req.user.lastName} has submitted a ${requestData.type} request.`,
            relatedId: request.id,
            relatedType: "request"
          });
        }
      }

      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put('/api/requests/:id/status', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { status, resolution } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
      }

      const request = await getStorage().getRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      const updatedRequest = await getStorage().updateRequestStatus(
        requestId,
        status as 'approved' | 'rejected',
        req.user!.publicId,
        resolution
      );

      await getStorage().createNotification({
        userId: request.studentId,
        title: "Request Status Update",
        content: `Your ${request.type} request has been ${status}.`,
        relatedId: request.id,
        relatedType: "request"
      });

      res.json(updatedRequest);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });
}
