import { Express } from "express";
import { getStorage } from "../storage";
import { insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import type { RouteContext } from "./index";

export function registerDocumentRoutes(app: Express, { authenticateUser, requireRole, upload }: RouteContext) {
  // Document Routes
  app.get(
    '/api/documents/user/:userId',
    authenticateUser,
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.userId);
      if (req.user!.id !== userId && req.user!.role === 'student') {
        return res.status(403).json({
          message: 'Forbidden',
          details: 'Students can only access their own documents',
        });
      }
      const documents = await getStorage().getDocumentsByUser(userId);
      res.json(documents);
    })
  );

  app.get(
    '/api/documents/user/:userId/type/:type',
    authenticateUser,
    asyncHandler(async (req, res) => {
      const userId = parseInt(req.params.userId);
      const type = req.params.type;
      if (req.user!.id !== userId && req.user!.role === 'student') {
        return res.status(403).json({
          message: 'Forbidden',
          details: 'Students can only access their own documents',
        });
      }
      const documents = await getStorage().getDocumentsByType(userId, type);
      res.json(documents);
    })
  );

  app.post(
    '/api/documents',
    authenticateUser,
    requireRole(['admin']),
    upload.single('file'),
    asyncHandler(async (req, res) => {
      let documentData;
      try {
        documentData = insertDocumentSchema.parse({
          ...req.body,
          createdBy: req.user!.id,
          fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const err: any = new Error('Validation error');
          err.status = 400;
          err.details = error.errors;
          throw err;
        }
        throw error;
      }
      const document = await getStorage().createDocument(documentData);
      await getStorage().createNotification({
        userId: documentData.userId,
        title: 'New Document',
        content: `A new ${documentData.type} document "${documentData.title}" is available.`,
        relatedId: document.id,
        relatedType: 'document',
      });
      res.status(201).json(document);
    })
  );
}
