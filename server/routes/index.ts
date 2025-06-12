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
import { db } from "../db";
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

import { registerAssignmentRoutes } from "./assignments";
import { registerMessageRoutes } from "./messages";
import { registerRequestRoutes } from "./requests";
import { registerDocumentRoutes } from "./documents";
import { registerNotificationRoutes } from "./notifications";
import { registerActivityLogRoutes } from "./activityLogs";
import { registerCurriculumRoutes } from "./curriculum";
// Extend the Express Request interface with session
interface Request extends ExpressRequest {
  user?: User;
  session: any;
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
  authenticateUser: typeof authenticateUser;
  requireRole: typeof requireRole;
  upload: typeof upload;
}

// Auth middleware - Use passport.js authentication
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Подробное логирование сессии для отладки проблем аутентификации
    logger.info(`Auth check - Session ID: ${req.sessionID}`);
    logger.info(`Auth check - Is Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'method undefined'}`);
    logger.info(`Auth check - User: ${req.user ? JSON.stringify({ id: req.user!.id, role: req.user!.role }) : 'undefined'}`);
    logger.info(`Auth check - Cookies: ${req.headers.cookie}`);
    logger.info(`Auth check - Session data:`, req.session);
    
    // Если пользователь аутентифицирован через passport, пропускаем
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      logger.info(`User authenticated normally: ${req.user!.id} (${req.user!.role})`);
      
      // Принудительно сохраняем сессию при каждом запросе
      if (req.session) {
        req.session.touch();
      }
      
      return next();
    }
    
    // Проверяем данные в сессии напрямую
    if (req.session && req.session.passport && req.session.passport.user) {
      logger.info(`Auth check - Session contains user ID: ${req.session.passport.user}`);
      
      try {
        // Попытка восстановить пользователя из ID в сессии
        const userId = req.session.passport.user;
        const user = await getStorage().getUser(userId);
        
        if (user) {
          logger.info(`Auth check - Recovered user from session: ${user.id} (${user.role})`);
          (req as any).user = user; // Восстанавливаем пользователя
          return next();
        }
      } catch (err) {
        logger.error("Error recovering user from session:", err);
      }
    }
    
    // Делаем финальную проверку cookie для отладки
    if (!req.headers.cookie || !req.headers.cookie.includes('eduportal.sid')) {
      logger.warn(`Auth failed - No session cookie found in request`);
    }
    
    // Если все способы восстановления сессии не удались, возвращаем 401
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  } catch (error) {
    logger.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
};

// Role check middleware
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user!.role)) {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }
    
    next();
  };
};

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
  
  // Set up WebSockets for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Set up authentication
  setupAuth(app);
  
  // Store active connections with user IDs
  const connections = new Map<number, WebSocket>();
  
  wss.on('connection', (ws) => {
    let userId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'auth') {
          userId = Number(data.userId);
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

  registerAssignmentRoutes(app, ctx);
  registerMessageRoutes(app, ctx);
  registerRequestRoutes(app, ctx);
  registerDocumentRoutes(app, ctx);
  registerNotificationRoutes(app, ctx);
  registerActivityLogRoutes(app, ctx);
  registerCurriculumRoutes(app, ctx);
  
  return httpServer;
}

// Add user property to Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
