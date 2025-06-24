import type { Express, Response, NextFunction, Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "../storage";
import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { logger } from "../utils/logger";
import { setupAuth } from "../auth";
import { 
  loginSchema, insertUserSchema, 
  insertSubjectSchema, insertEnrollmentSchema, 
  insertScheduleItemSchema, insertAssignmentSchema,
  insertSubmissionSchema, insertGradeSchema,
  insertRequestSchema, insertDocumentSchema,
  insertMessageSchema, insertNotificationSchema,
  insertTaskSchema, taskPriorityEnum, taskStatusEnum,
  User
} from "@shared/schema";
import { object, string, z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { 
  parseSheetDataToScheduleItems, 
  fetchSheetData, 
  authenticateWithGoogleSheets, 
  ScheduleImportResult 
} from "../utils/googleSheetsHelper";
import { parseCsvToScheduleItems, validateScheduleItems, prepareImportResult } from "../utils/csvHelper";
import { registerUserRoutes } from "./users";
import { registerScheduleRoutes } from "./schedule";
import { registerTaskRoutes } from "./tasks";

import { supabase } from "../supabaseClient";

import { registerAssignmentRoutes } from "./assignments";
import { registerMessageRoutes } from "./messages";
import { registerRequestRoutes } from "./requests";
import { registerDocumentRoutes } from "./documents";
import { registerNotificationRoutes } from "./notifications";
import { registerActivityLogRoutes } from "./activityLogs";
import { registerCurriculumRoutes } from "./curriculum";
import { verifySupabaseJwt } from "../middleware/verifySupabaseJwt";
import { requireRole } from "../middleware/requireRole";
import type { AuthenticatedUser } from "../types/auth";
// Extend the Express Request interface
interface Request extends ExpressRequest {
  user?: AuthenticatedUser;
}

// Set up file upload storage
// Using import.meta.dirname instead of __dirname for ES modules
const UPLOADS_DIR = './uploads';

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // Create directory if it doesn't exist
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

export interface RouteContext {
  authenticateUser: typeof verifySupabaseJwt;
  requireRole: typeof requireRole;
  upload: typeof upload;
}

const authenticateUser = verifySupabaseJwt;


// Вспомогательная функция для получения ID преподавателя по умолчанию
async function getDefaultTeacherId(): Promise<number> {
  try {
    // Пытаемся найти пользователя с ролью "teacher"
    const teachers = await getStorage().getUsersByRole('teacher');
    if (teachers && teachers.length > 0) {
      logger.info(`Found ${teachers.length} teachers, using ${teachers[0].firstName} ${teachers[0].lastName} (ID: ${teachers[0].id}) as default`);
      return teachers[0].id;
    }
    
    // Если учителей нет, создаем тестового преподавателя
    logger.info('No teachers found, using fallback teacher ID 2');
    return 2; // ID тестового преподавателя
  } catch (error) {
    logger.error('Error getting default teacher:', error);
    return 2; // В случае ошибки возвращаем ID тестового преподавателя
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Global middleware to trace chat and user requests
  app.use('/api/users/chat', (req, res, next) => {
    console.log('🚨 [GLOBAL] /api/users/chat intercepted!');
    console.log('🚨 [GLOBAL] Method:', req.method);
    console.log('🚨 [GLOBAL] Headers:', req.headers);
    console.log('🚨 [GLOBAL] User:', (req as any).user);
    next();
  });

  // Log all /api/users requests
  app.use('/api/users', (req, _res, next) => {
    console.log('🔍 [GLOBAL] /api/users/* hit:', req.path);
    console.log('🔍 [GLOBAL] Full URL:', req.url);
    next();
  });
  
  // Set up WebSockets for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Set up authentication
  setupAuth(app);
  
  // Store active connections with user IDs
  const connections = new Map<string, WebSocket>();
  
  wss.on('connection', (ws) => {
    let userId: string | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'auth') {
          userId = data.userId as string;
          connections.set(userId, ws);
          logger.info(`User ${userId} connected to WebSocket`);
          
          // Send any undelivered messages to the user
          const messages = await getStorage().getMessagesByUser(userId);
          const undeliveredMessages = messages.filter(m => 
            m.toUserId === userId && m.status === 'sent'
          );
          
          for (const message of undeliveredMessages) {
            // Mark as delivered
            await getStorage().updateMessageStatus(message.id, 'delivered');
            
            ws.send(JSON.stringify({
              type: 'message',
              message
            }));
          }
        }
        
        // Handle new messages
        if (data.type === 'message' && userId) {
          const { toUserId, content } = data;
          
          // Save the message
          const message = await getStorage().createMessage({
            fromUserId: userId,
            toUserId,
            content
          });
          
          // Send to recipient if they're connected
          const recipientWs = connections.get(toUserId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'message',
              message
            }));
            
            // Mark as delivered
            await getStorage().updateMessageStatus(message.id, 'delivered');
          }
          
          // Confirm to sender
          ws.send(JSON.stringify({
            type: 'messageSent',
            messageId: message.id
          }));
        }
        
        // Handle read receipts
        if (data.type === 'markAsRead' && userId) {
          const { messageId } = data;
          await getStorage().updateMessageStatus(messageId, 'read');
        }
      } catch (error) {
        logger.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        connections.delete(userId);
        logger.info(`User ${userId} disconnected from WebSocket`);
      }
    });
  });
  
  // Auth Routes are handled in server/auth.ts

  const ctx: RouteContext = { authenticateUser, requireRole, upload };
  registerUserRoutes(app, ctx);
  registerScheduleRoutes(app, ctx);
  registerTaskRoutes(app, ctx);

  // Основные разделы
  registerAssignmentRoutes(app, ctx);
  registerMessageRoutes(app, ctx);
  registerNotificationRoutes(app, ctx);

  // Временное отключение второстепенных модулей
  registerRequestRoutes(app, ctx);
  // registerDocumentRoutes(app, ctx);
  // registerActivityLogRoutes(app, ctx);
  // registerCurriculumRoutes(app, ctx);

  // Lightweight Supabase-based endpoints

  app.get('/api/debug/permissions', authenticateUser, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    res.json({
      user_id: req.user.id,
      email: req.user.email,
      role_from_jwt: (req.user as any).user_metadata?.role,
      app_metadata: (req.user as any).app_metadata,
      user_metadata: (req.user as any).user_metadata,
      permissions: {
        can_access_users: (req.user as any).user_metadata?.role === 'admin',
        can_create_requests: true,
        can_view_subjects: true,
      },
    });
  });

  // Handle unknown /api routes with JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  return httpServer;
}

// Add user property to Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
