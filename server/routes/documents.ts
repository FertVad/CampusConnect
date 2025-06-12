import { Express } from "express";
import { getStorage } from "../storage";
import { insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import type { RouteContext } from "./index";

export function registerDocumentRoutes(app: Express, { authenticateUser, requireRole, upload }: RouteContext) {
  // Document Routes
  app.get('/api/documents/user/:userId', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (req.user!.id !== userId && req.user!.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const documents = await getStorage().getDocumentsByUser(userId);
      res.json(documents);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/documents/user/:userId/type/:type', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const type = req.params.type;
      if (req.user!.id !== userId && req.user!.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const documents = await getStorage().getDocumentsByType(userId, type);
      res.json(documents);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/documents', authenticateUser, requireRole(['admin']), upload.single('file'), async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null
      });
      const document = await getStorage().createDocument(documentData);
      await getStorage().createNotification({
        userId: documentData.userId,
        title: "New Document",
        content: `A new ${documentData.type} document "${documentData.title}" is available.`,
        relatedId: document.id,
        relatedType: "document"
      });
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
}
