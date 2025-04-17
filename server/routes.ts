import type { Express, Response, NextFunction, Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./storage";
import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { setupAuth } from "./auth";
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
import { db } from "./db";
import { 
  parseSheetDataToScheduleItems, 
  fetchSheetData, 
  authenticateWithGoogleSheets, 
  ScheduleImportResult 
} from "./utils/googleSheetsHelper";
import { parseCsvToScheduleItems, validateScheduleItems, prepareImportResult } from "./utils/csvHelper";

// Extend the Express Request interface with session
interface Request extends ExpressRequest {
  user?: User;
  isAuthenticated?: () => boolean;
  logout?: (cb: (err: any) => void) => void;
  login?: (user: User, cb: (err: any) => void) => void;
  session?: any;
  sessionID?: string;
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

// Auth middleware - Use passport.js authentication
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Подробное логирование сессии для отладки проблем аутентификации
    console.log(`Auth check - Session ID: ${req.sessionID}`);
    console.log(`Auth check - Is Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'method undefined'}`);
    console.log(`Auth check - User: ${req.user ? JSON.stringify({ id: req.user.id, role: req.user.role }) : 'undefined'}`);
    
    // Проверяем как метод isAuthenticated, так и наличие объекта пользователя
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log(`User authenticated: ${req.user.id} (${req.user.role})`);
      
      // Принудительно сохраняем сессию при каждом запросе
      if (req.session) {
        req.session.touch();
        req.session.save();
      }
      
      return next();
    }
    
    // Если нет сессии или пользователя, пробуем найти по session ID
    if (req.sessionID) {
      const storage = getStorage();
      // Временное решение для отладки
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }
    
    // Если нет сессии или пользователя, возвращаем ошибку 401
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
};

// Role check middleware
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
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
      console.log(`Found ${teachers.length} teachers, using ${teachers[0].firstName} ${teachers[0].lastName} (ID: ${teachers[0].id}) as default`);
      return teachers[0].id;
    }
    
    // Если учителей нет, создаем тестового преподавателя
    console.log('No teachers found, using fallback teacher ID 2');
    return 2; // ID тестового преподавателя
  } catch (error) {
    console.error('Error getting default teacher:', error);
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
          console.log(`User ${userId} connected to WebSocket`);
          
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
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        connections.delete(userId);
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });
  
  // Auth Routes are handled in server/auth.ts
  
  // User Routes
  app.get('/api/users', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const users = await getStorage().getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/users/:id', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only view their own profile unless they're admins
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const user = await getStorage().getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/users', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await getStorage().createUser(userData);
      
      // Отправляем уведомление всем администраторам кроме текущего пользователя
      const admins = await getStorage().getUsersByRole('admin');
      
      // Получаем полное имя нового пользователя для уведомления
      const fullName = `${user.firstName} ${user.lastName}`;
      
      // Отправляем уведомления всем администраторам, кроме текущего (если он админ)
      for (const admin of admins) {
        if (admin.id !== req.user?.id) {
          await getStorage().createNotification({
            userId: admin.id,
            title: "New User Registered",
            content: `A new user ${fullName} has been registered with role: ${user.role}`,
            relatedId: user.id,
            relatedType: "user"
          });
        }
      }
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error('Error creating user:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/users/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`🔄 PUT /api/users/${userId} - Updating user profile. Admin ID: ${req.user?.id}`);
      
      const userData = insertUserSchema.partial().parse(req.body);
      console.log('📋 Update data:', JSON.stringify(userData));
      
      const updatedUser = await getStorage().updateUser(userId, userData);
      
      if (!updatedUser) {
        console.log(`⚠️ User with ID ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`✅ User ${userId} updated successfully:`, JSON.stringify(updatedUser));
      
      // Создаем уведомление для пользователя об обновлении его данных
      try {
        console.log(`📣 Creating notifications for user update...`);
        const storage = getStorage();
        const fullName = `${updatedUser.firstName} ${updatedUser.lastName}`;
        
        // Создаем уведомление для самого пользователя (если обновление сделал не он сам)
        if (req.user && req.user.id !== updatedUser.id) {
          console.log(`📨 Creating notification for updated user (ID: ${updatedUser.id})`);
          const userNotification = await storage.createNotification({
            userId: updatedUser.id,
            title: "User Updated",
            content: `Ваш профиль был обновлён администратором.`,
            relatedType: "user",
            relatedId: updatedUser.id
          });
          console.log(`✓ Created notification for user: ${userNotification.id}`);
        }
        
        // Если обновление сделал администратор, создаем уведомление для него
        if (req.user && req.user.role === 'admin') {
          console.log(`📨 Creating notification for admin who made the change (ID: ${req.user.id})`);
          const adminNotification = await storage.createNotification({
            userId: req.user.id,
            title: "User Updated",
            content: `Вы обновили профиль пользователя ${fullName}.`,
            relatedType: "user",
            relatedId: updatedUser.id
          });
          console.log(`✓ Created notification for admin: ${adminNotification.id}`);
          
          // Получаем всех администраторов
          console.log(`🔍 Getting all admin users...`);
          const admins = await storage.getUsersByRole('admin');
          console.log(`📊 Found ${admins.length} admin users`);
          
          // Отправляем уведомления другим администраторам
          let notificationCount = 0;
          for (const admin of admins) {
            // Не отправляем уведомление админу, который сделал изменения
            if (admin.id !== req.user.id) {
              console.log(`📨 Creating notification for other admin (ID: ${admin.id})`);
              const otherAdminNotification = await storage.createNotification({
                userId: admin.id,
                title: "User Updated",
                content: `Профиль пользователя ${fullName} был обновлён.`,
                relatedType: "user",
                relatedId: updatedUser.id
              });
              console.log(`✓ Created notification for other admin: ${otherAdminNotification.id}`);
              notificationCount++;
            }
          }
          console.log(`📊 Created ${notificationCount} notifications for other admins`);
        }
        
        console.log(`🎉 All notifications created successfully!`);
      } catch (notificationError) {
        console.error("❌ Error creating user update notification:", notificationError);
        if (notificationError instanceof Error) {
          console.error("❌ Error details:", {
            name: notificationError.name,
            message: notificationError.message,
            stack: notificationError.stack
          });
        }
        // Продолжаем, даже если не удалось создать уведомление
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('❌ Error updating user:', error);
      if (error instanceof z.ZodError) {
        console.error('❌ Validation error:', JSON.stringify(error.errors));
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/users/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await getStorage().deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Subject Routes
  app.get('/api/subjects', authenticateUser, async (req, res) => {
    try {
      const subjects = await getStorage().getSubjects();
      console.log('Retrieved subjects:', JSON.stringify(subjects, null, 2));
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/subjects/:id', authenticateUser, async (req, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      const subject = await getStorage().getSubject(subjectId);
      
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      res.json(subject);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get subjects taught by the current teacher
  app.get('/api/subjects/teacher', authenticateUser, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const subjects = await getStorage().getSubjectsByTeacher(req.user.id);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/subjects', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const subjectData = insertSubjectSchema.parse(req.body);
      const subject = await getStorage().createSubject(subjectData);
      res.status(201).json(subject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/subjects/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      const subjectData = insertSubjectSchema.partial().parse(req.body);
      const updatedSubject = await getStorage().updateSubject(subjectId, subjectData);
      
      if (!updatedSubject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      res.json(updatedSubject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/subjects/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      const success = await getStorage().deleteSubject(subjectId);
      
      if (!success) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Enrollment Routes
  app.get('/api/enrollments', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const enrollments = await getStorage().getEnrollments();
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/enrollments/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Students can only view their own enrollments unless they're admins/teachers
      if (req.user.id !== studentId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const enrollments = await getStorage().getEnrollmentsByStudent(studentId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/enrollments/subject/:subjectId', authenticateUser, async (req, res) => {
    try {
      const subjectId = parseInt(req.params.subjectId);
      const enrollments = await getStorage().getEnrollmentsBySubject(subjectId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/enrollments', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const enrollmentData = insertEnrollmentSchema.parse(req.body);
      const enrollment = await getStorage().createEnrollment(enrollmentData);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/enrollments/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const enrollmentId = parseInt(req.params.id);
      const success = await getStorage().deleteEnrollment(enrollmentId);
      
      if (!success) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Schedule Routes
  app.get('/api/schedule', authenticateUser, async (req, res) => {
    try {
      const schedule = await getStorage().getScheduleItems();
      
      // Получаем информацию о предметах и преподавателях для каждого элемента расписания
      const enrichedSchedule = await Promise.all(schedule.map(async (item) => {
        let subject = await getStorage().getSubject(item.subjectId);
        
        // Если предмет не найден в базе, пропускаем этот элемент расписания
        if (!subject) {
          console.log(`Subject with ID ${item.subjectId} not found, skipping schedule item`);
          return null; 
        }
        
        // Определяем имя преподавателя
        let teacherName = null;
        
        // Сначала проверяем, есть ли имя преподавателя непосредственно в элементе расписания
        if (item.teacherName) {
          teacherName = item.teacherName;
        } 
        // Если нет, пробуем получить имя преподавателя из связанного пользователя
        else if (subject.teacherId) {
          const teacher = await getStorage().getUser(subject.teacherId);
          if (teacher) {
            teacherName = `${teacher.firstName} ${teacher.lastName}`;
          }
        }
        
        // Добавляем информацию о предмете и преподавателе к элементу расписания
        return {
          ...item,
          subject: {
            ...subject
          },
          teacherName: teacherName || 'Not assigned'
        };
      }));
      
      // Фильтруем элементы, где предмет не найден
      const validSchedule = enrichedSchedule.filter(item => item !== null);
      
      console.log(`Returning ${validSchedule.length} valid schedule items with subject and teacher info`);
      res.json(validSchedule);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Маршрут для скачивания шаблона CSV для импорта расписания
  app.get('/schedule-template.csv', (req, res) => {
    try {
      // Упрощенный CSV шаблон с заголовками и образцами данных
      const csvTemplate = 'Subject,Day,Start Time,End Time,Room,Teacher\nMath,Monday,09:00,10:30,305,Anna Ivanova\nProgramming,Tuesday,11:00,12:30,412,Oleg Petrov';
      
      // Установка заголовков для скачивания файла
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=schedule-template.csv');
      
      // Отправка CSV данных
      res.send(csvTemplate);
    } catch (error) {
      console.error('Error generating CSV template:', error);
      res.status(500).send('Ошибка при генерации шаблона CSV');
    }
  });
  
  app.get('/api/schedule/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Students can only view their own schedule unless they're admins/teachers
      if (req.user.id !== studentId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const schedule = await getStorage().getScheduleItemsByStudent(studentId);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Simplified route for student's own schedule
  app.get('/api/schedule/student', authenticateUser, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      console.log(`Fetching schedule for student with ID: ${req.user.id}`);
      const schedule = await getStorage().getScheduleItemsByStudent(req.user.id);
      console.log(`Found ${schedule.length} schedule items for student ${req.user.id}`);
      
      res.json(schedule);
    } catch (error) {
      console.error('Error fetching student schedule:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/schedule/teacher/:teacherId', authenticateUser, async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      // Teachers can only view their own schedule unless they're admins
      if (req.user.id !== teacherId && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const schedule = await getStorage().getScheduleItemsByTeacher(teacherId);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Simplified route for teacher's own schedule
  app.get('/api/schedule/teacher', authenticateUser, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      console.log(`Fetching schedule for teacher with ID: ${req.user.id}`);
      const schedule = await getStorage().getScheduleItemsByTeacher(req.user.id);
      console.log(`Found ${schedule.length} schedule items for teacher ${req.user.id}`);
      
      res.json(schedule);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/schedule', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const scheduleData = insertScheduleItemSchema.parse(req.body);
      const scheduleItem = await getStorage().createScheduleItem(scheduleData);
      res.status(201).json(scheduleItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/schedule/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const scheduleData = insertScheduleItemSchema.partial().parse(req.body);
      const updatedSchedule = await getStorage().updateScheduleItem(scheduleId, scheduleData);
      
      if (!updatedSchedule) {
        return res.status(404).json({ message: "Schedule item not found" });
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/schedule/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const success = await getStorage().deleteScheduleItem(scheduleId);
      
      if (!success) {
        return res.status(404).json({ message: "Schedule item not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Schedule Import Routes - Google Sheets (Option A)
  app.post('/api/schedule/import/google-sheets', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      // Extract parameters from the request body
      const { credentials, spreadsheetId, range = 'Sheet1!A1:E' } = req.body;
      
      if (!credentials || !spreadsheetId) {
        return res.status(400).json({ 
          message: "Missing required parameters. Please provide Google API credentials and spreadsheet ID."
        });
      }
      
      // Authenticate with Google Sheets API
      const sheets = await authenticateWithGoogleSheets(credentials);
      
      // Fetch data from the specified sheet
      const sheetData = await fetchSheetData(sheets, spreadsheetId, range);
      
      if (sheetData.length <= 1) { // Only header row or empty
        return res.status(400).json({ message: "No data found in the specified range" });
      }
      
      // Parse the sheet data to schedule items
      const { scheduleItems, errors: parseErrors } = parseSheetDataToScheduleItems(sheetData);
      
      // Функция для генерации цвета из палитры предопределенных цветов
      const getColorFromPalette = (index: number): string => {
        const colors = [
          '#4285F4', // Google Blue
          '#34A853', // Google Green
          '#FBBC05', // Google Yellow
          '#EA4335', // Google Red
          '#8E44AD', // Purple
          '#2ECC71', // Emerald
          '#E74C3C', // Red
          '#3498DB', // Blue
          '#F39C12', // Orange
          '#1ABC9C', // Turquoise
        ];
        return colors[index % colors.length];
      };
      
      // Счетчик новых предметов для равномерного распределения цветов
      let newSubjectCounter = 0;
      
      // Обрабатываем предметы по их названиям
      // Сначала получаем все существующие предметы
      const allSubjects = await getStorage().getSubjects();
      console.log(`Existing subjects: ${allSubjects.length}`);
      
      // Обрабатываем каждый элемент расписания
      for (const item of scheduleItems) {
        try {
          // Проверяем, есть ли у элемента информация о предмете
          const subjectName = (item as any).subjectName;
          if (!subjectName) {
            continue; // Пропускаем элементы без названия предмета
          }
          
          // Ищем предмет по названию среди существующих
          const existingSubject = allSubjects.find(
            s => s.name.toLowerCase() === subjectName.toLowerCase()
          );
          
          if (existingSubject) {
            // Если предмет найден, используем его ID
            console.log(`Found existing subject "${existingSubject.name}" with ID: ${existingSubject.id}`);
            item.subjectId = existingSubject.id;
          } else {
            // Если предмет не найден, создаем новый
            console.log(`Creating new subject with name: "${subjectName}"`);
            
            // Увеличиваем счетчик для выбора цвета
            newSubjectCounter++;
              
            // Создаем предмет
            const newSubject = await getStorage().createSubject({
              name: subjectName,
              shortName: subjectName.substring(0, 10), // Берем первые 10 символов как сокращение
              description: 'Автоматически созданный предмет из импорта расписания',
              // Ищем ID первого преподавателя в системе
              teacherId: await getDefaultTeacherId(),
              color: getColorFromPalette(newSubjectCounter) // Выбираем цвет из палитры
            });
            
            console.log(`Created new subject: ${JSON.stringify(newSubject)}`);
            
            // Добавляем новый предмет в массив для будущих проверок
            allSubjects.push(newSubject);
            
            // Устанавливаем ID предмета в элемент расписания
            item.subjectId = newSubject.id;
          }
        } catch (error) {
          console.error(`Error processing subject for schedule item:`, error);
        }
      }
      
      // Проверяем наличие корректных элементов для импорта после обработки
      // Validate the schedule items
      const { validItems, errors: validationErrors } = await validateScheduleItems(
        scheduleItems,
        async (subjectId) => {
          // Всегда возвращаем true, так как мы уже создали все необходимые предметы
          // или проверили их существование на предыдущем шаге
          return true;
        }
      );
      
      // Проверка на пустой импорт
      if (validItems.length === 0) {
        return res.status(400).json({ 
          message: "Не удалось импортировать ни один элемент расписания", 
          errors: [...parseErrors, ...validationErrors] 
        });
      }
      
      // Insert valid items into the database
      const createdItems = [];
      for (const item of validItems) {
        // Удаляем временное поле с названием предмета перед созданием
        const cleanItem = { ...item };
        delete (cleanItem as any).subjectName;
        
        // Создаем элемент расписания
        const created = await getStorage().createScheduleItem(cleanItem);
        createdItems.push(created);
      }
      
      // Prepare and return the import result
      const result = prepareImportResult(
        scheduleItems.length,
        validItems,
        [...parseErrors, ...validationErrors]
      );
      
      // Сохраняем информацию о загруженном файле в базу данных
      try {
        const gsheetFileInfo = await getStorage().createImportedFile({
          originalName: req.file.originalname,
          storedName: path.basename(req.file.path),
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          importType: 'csv',
          status: result.success > 0 ? 'success' : 'error',
          itemsCount: result.total,
          successCount: result.success,
          errorCount: result.total - result.success,
          uploadedBy: req.user!.id
        });
        
        console.log(`Created import file record: ${gsheetFileInfo.id}`);
        
        // Обновляем созданные элементы расписания, чтобы связать их с файлом
        for (const item of createdItems) {
          await getStorage().updateScheduleItem(item.id, {
            ...item,
            importedFileId: gsheetFileInfo.id
          });
          console.log(`Linked schedule item ${item.id} with imported file ${gsheetFileInfo.id}`);
        }
      } catch (fileError) {
        console.error('Error saving file import record:', fileError);
        // Не прерываем операцию, если не удалось сохранить информацию о файле
      }
      
      res.status(200).json({
        message: `Successfully imported ${result.success} out of ${result.total} schedule items.`,
        result
      });
    } catch (error: any) {
      console.error('Error importing schedule from Google Sheets:', error);
      res.status(500).json({ 
        message: "Failed to import schedule from Google Sheets",
        error: error.message || 'Unknown error'
      });
    }
  });
  
  // Schedule Import Routes - CSV Upload (Option B)
  app.post(
    '/api/schedule/import/csv', 
    authenticateUser, 
    requireRole(['admin']), 
    upload.single('csvFile'), 
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No CSV file uploaded" });
        }
        
        // Get the path to the uploaded file
        const filePath = req.file.path;
        console.log(`Processing uploaded CSV file at: ${filePath}`);
        
        // Проверяем и получаем информацию о CSV файле
        const csvFileInfo = {
          mime: req.file.mimetype,
          size: req.file.size,
          name: req.file.originalname
        };
        
        console.log(`CSV File Info - Type: ${csvFileInfo.mime}, Size: ${csvFileInfo.size} bytes, Name: ${csvFileInfo.name}`);
        
        // Parse the CSV file to schedule items - не передаем заголовки, чтобы функция автоматически определила их
        const { scheduleItems, errors: parseErrors } = await parseCsvToScheduleItems(filePath);
        console.log(`Parsed CSV data: Found ${scheduleItems.length} potential schedule items with ${parseErrors.length} parse errors`);
        
        // Функция для генерации цвета из палитры предопределенных цветов
        const getColorFromPalette = (index: number): string => {
          const colors = [
            '#4285F4', // Google Blue
            '#34A853', // Google Green
            '#FBBC05', // Google Yellow
            '#EA4335', // Google Red
            '#8E44AD', // Purple
            '#2ECC71', // Emerald
            '#E74C3C', // Red
            '#3498DB', // Blue
            '#F39C12', // Orange
            '#1ABC9C', // Turquoise
          ];
          return colors[index % colors.length];
        };
        
        // Счетчик новых предметов для равномерного распределения цветов
        let newSubjectCounter = 0;
        
        // Обрабатываем предметы по их названиям
        // Сначала получаем все существующие предметы
        const allSubjects = await getStorage().getSubjects();
        console.log(`Existing subjects: ${allSubjects.length}`);
        
        // Обрабатываем каждый элемент расписания
        for (const item of scheduleItems) {
          try {
            // Проверяем, есть ли у элемента информация о предмете
            const subjectName = (item as any).subjectName;
            if (!subjectName) {
              continue; // Пропускаем элементы без названия предмета
            }
            
            // Ищем предмет по названию среди существующих
            const existingSubject = allSubjects.find(
              s => s.name.toLowerCase() === subjectName.toLowerCase()
            );
            
            if (existingSubject) {
              // Если предмет найден, используем его ID
              console.log(`Found existing subject "${existingSubject.name}" with ID: ${existingSubject.id}`);
              item.subjectId = existingSubject.id;
            } else {
              // Если предмет не найден, создаем новый
              console.log(`Creating new subject with name: "${subjectName}"`);
              
              // Увеличиваем счетчик для выбора цвета
              newSubjectCounter++;
              
              // Создаем предмет
              const newSubject = await getStorage().createSubject({
                name: subjectName,
                shortName: subjectName.substring(0, 10), // Берем первые 10 символов как сокращение
                description: 'Автоматически созданный предмет из импорта расписания',
                // Используем идентификатор преподавателя по умолчанию, но это не важно,
                // так как в расписании будем использовать строковое имя преподавателя
                teacherId: await getDefaultTeacherId(),
                color: getColorFromPalette(newSubjectCounter) // Выбираем цвет из палитры
              });
              
              console.log(`Created new subject: ${JSON.stringify(newSubject)}`);
              
              // Добавляем новый предмет в массив для будущих проверок
              allSubjects.push(newSubject);
              
              // Устанавливаем ID предмета в элемент расписания
              item.subjectId = newSubject.id;
            }
          } catch (error) {
            console.error(`Error processing subject for schedule item:`, error);
          }
        }
        
        // Проверяем наличие корректных элементов для импорта после обработки
        // Validate the schedule items
        const { validItems, errors: validationErrors } = await validateScheduleItems(
          scheduleItems,
          async (subjectId) => {
            // Всегда возвращаем true, так как мы уже создали все необходимые предметы
            // или проверили их существование на предыдущем шаге
            return true;
          }
        );
        
        // Проверка на пустой импорт
        if (validItems.length === 0) {
          return res.status(400).json({ 
            message: "Не удалось импортировать ни один элемент расписания", 
            errors: [...parseErrors, ...validationErrors] 
          });
        }
        
        // Insert valid items into the database
        const createdItems = [];
        for (const item of validItems) {
          // Создаем чистый объект для вставки, но сохраняем teacherName если есть
          const cleanItem = { 
            subjectId: item.subjectId,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            roomNumber: item.roomNumber,
            teacherName: item.teacherName || (item as any).teacherName || null
          };
          
          // Удаляем временное поле с названием предмета
          delete (cleanItem as any).subjectName;
          
          // Создаем элемент расписания
          const created = await getStorage().createScheduleItem(cleanItem);
          createdItems.push(created);
        }
        
        // Prepare and return the import result
        const result = prepareImportResult(
          scheduleItems.length,
          validItems,
          [...parseErrors, ...validationErrors]
        );
        
        // Сохраняем информацию о загруженном файле в базу данных
        try {
          const importFileInfo = await getStorage().createImportedFile({
            originalName: req.file.originalname,
            storedName: path.basename(req.file.path),
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            importType: 'csv',
            status: result.success > 0 ? 'success' : 'error',
            itemsCount: result.total,
            successCount: result.success,
            errorCount: result.errors.length,
            uploadedBy: req.user!.id
          });
          
          console.log(`Created import file record: ${importFileInfo.id}`);
          
          // Обновляем созданные элементы расписания, чтобы связать их с файлом
          for (const item of createdItems) {
            await getStorage().updateScheduleItem(item.id, {
              ...item,
              importedFileId: importFileInfo.id
            });
            console.log(`Linked schedule item ${item.id} with imported file ${importFileInfo.id}`);
          }
        } catch (fileError) {
          console.error('Error saving file import record:', fileError);
          // Не прерываем операцию, если не удалось сохранить информацию о файле
        }
        
        res.status(200).json({
          message: `Successfully imported ${result.success} out of ${result.total} schedule items.`,
          result
        });
      } catch (error: any) {
        console.error('Error importing schedule from CSV:', error);
        
        // Clean up the uploaded file if exists
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
          message: "Failed to import schedule from CSV file",
          error: error.message || 'Unknown error'
        });
      }
    }
  );
  
  // Imported Files Routes
  app.get('/api/imported-files', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const files = await getStorage().getImportedFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/imported-files/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await getStorage().getImportedFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/imported-files/user/:userId', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const files = await getStorage().getImportedFilesByUser(userId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/imported-files/type/:type', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const type = req.params.type as 'csv' | 'google-sheets';
      
      if (type !== 'csv' && type !== 'google-sheets') {
        return res.status(400).json({ message: "Invalid file type. Must be 'csv' or 'google-sheets'" });
      }
      
      const files = await getStorage().getImportedFilesByType(type);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete('/api/imported-files/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error('Invalid file ID provided:', req.params.id);
        return res.status(400).json({ 
          error: true,
          message: "Invalid file ID", 
          details: "The file ID must be a valid number"
        });
      }
      
      console.log(`[DELETE FILE] Processing delete request for imported file ID: ${id}`);
      
      // Step 1: Get the file details
      const file = await getStorage().getImportedFile(id);
      
      if (!file) {
        console.log(`[DELETE FILE] File with ID ${id} not found`);
        return res.status(404).json({ 
          error: true, 
          message: "File not found",
          details: `No file with ID ${id} exists in the database`
        });
      }
      
      console.log(`[DELETE FILE] Found file: ${file.originalName}, import type: ${file.importType}`);
      
      // Step 2: Delete the physical file if it exists
      let physicalFileDeleted = false;
      
      if (file.filePath && file.importType === 'csv') {
        const fullPath = path.join(process.cwd(), file.filePath);
        console.log(`[DELETE FILE] Attempting to delete physical file at: ${fullPath}`);
        
        try {
          await fs.promises.access(fullPath);
          await fs.promises.unlink(fullPath);
          console.log(`[DELETE FILE] Successfully deleted physical file: ${fullPath}`);
          physicalFileDeleted = true;
        } catch (err) {
          console.error(`[DELETE FILE] Could not delete physical file ${fullPath}:`, err);
          // Continue with database operations even if physical file delete fails
        }
      }
      
      console.log(`[DELETE FILE] Now checking related schedule items for file ID: ${id}`);
      
      // Step 3: Get count of related schedule items before deletion
      const { scheduleItems } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      // Get count of related items
      const relatedItemsCount = await db.select({
          count: sql<number>`count(*)`,
        })
        .from(scheduleItems)
        .where(eq(scheduleItems.importedFileId, id))
        .then(result => Number(result[0]?.count || 0));
      
      console.log(`[DELETE FILE] Found ${relatedItemsCount} schedule items related to imported file ID: ${id}`);
      
      // Step 4: Delete the database records using our improved transaction-based method
      console.log(`[DELETE FILE] Attempting to delete file ID ${id} and related records from database`);
      const success = await getStorage().deleteImportedFile(id);
      
      // Step 5: Respond with appropriate status based on success
      if (success) {
        console.log(`[DELETE FILE] Successfully deleted imported file with ID: ${id} and all related schedule items`);
        return res.status(200).json({ 
          error: false,
          message: "File deleted successfully",
          info: {
            fileId: id,
            fileName: file.originalName,
            relatedItemsDeleted: relatedItemsCount,
            physicalFileDeleted
          }
        });
      } else {
        console.error(`[DELETE FILE] Database operation failed for deleting imported file with ID: ${id}`);
        return res.status(500).json({ 
          error: true,
          message: "Failed to delete file",
          details: "The database operation to delete the file record failed. This might be due to database constraints or a server issue.",
          info: {
            fileId: id,
            fileName: file.originalName,
            physicalFileDeleted
          }
        });
      }
    } catch (error) {
      // Enhanced error logging with prefix for easier debugging
      console.error('[DELETE FILE] Unhandled error in delete imported file handler:', error);
      
      // Provide more helpful error messages to both logs and response
      if (error instanceof Error) {
        console.error('[DELETE FILE] Detailed error:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        return res.status(500).json({ 
          error: true,
          message: "Error deleting file", 
          details: error.message,
          type: error.name
        });
      } else {
        return res.status(500).json({ 
          error: true,
          message: "Unknown server error occurred while deleting file"
        });
      }
    }
  });
  
  // Assignment Routes
  app.get('/api/assignments', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignments = await getStorage().getAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/assignments/:id', authenticateUser, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await getStorage().getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/assignments/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Students can only view their own assignments unless they're admins/teachers
      if (req.user.id !== studentId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const assignments = await getStorage().getAssignmentsByStudent(studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Simplified route for student's own assignments and submissions
  app.get('/api/assignments/student', authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all assignments for the student
      const assignments = await getStorage().getAssignmentsByStudent(req.user.id);
      
      // Get all submissions by this student
      const submissions = await getStorage().getSubmissionsByStudent(req.user.id);
      
      // Map submissions to assignments
      const assignmentsWithSubmissions = assignments.map(assignment => {
        const submission = submissions.find(sub => sub.assignmentId === assignment.id);
        return {
          ...assignment,
          submission: submission || null
        };
      });
      
      res.json(assignmentsWithSubmissions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/assignments/teacher/:teacherId', authenticateUser, async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      // Teachers can only view their own assignments unless they're admins
      if (req.user.id !== teacherId && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const assignments = await getStorage().getAssignmentsByTeacher(teacherId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Simplified route for teacher's own assignments with submissions
  app.get('/api/assignments/teacher', authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all assignments created by this teacher
      const assignments = await getStorage().getAssignmentsByTeacher(req.user.id);
      
      // For each assignment, get submissions count and other details
      const assignmentsWithDetails = await Promise.all(assignments.map(async assignment => {
        const submissions = await getStorage().getSubmissionsByAssignment(assignment.id);
        
        // Get subject details
        const subject = await getStorage().getSubject(assignment.subjectId);
        
        // Get student count for this subject
        const students = await getStorage().getStudentsBySubject(assignment.subjectId);
        
        return {
          ...assignment,
          subject,
          submissions,
          studentCount: students.length
        };
      }));
      
      res.json(assignmentsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/assignments', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      const assignment = await getStorage().createAssignment(assignmentData);
      
      // Create notifications for students in this subject
      const students = await getStorage().getStudentsBySubject(assignmentData.subjectId);
      for (const student of students) {
        await getStorage().createNotification({
          userId: student.id,
          title: "New Assignment",
          content: `A new assignment "${assignment.title}" has been posted for ${assignment.subjectId}.`,
          relatedId: assignment.id,
          relatedType: "assignment"
        });
      }
      
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/assignments/:id', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await getStorage().getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Teachers can only edit their own assignments unless they're admins
      if (req.user.role === 'teacher' && assignment.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const assignmentData = insertAssignmentSchema.partial().parse(req.body);
      const updatedAssignment = await getStorage().updateAssignment(assignmentId, assignmentData);
      
      res.json(updatedAssignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/assignments/:id', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await getStorage().getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Teachers can only delete their own assignments unless they're admins
      if (req.user.role === 'teacher' && assignment.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await getStorage().deleteAssignment(assignmentId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Submission Routes
  app.get('/api/submissions/assignment/:assignmentId', authenticateUser, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      
      // Get the assignment
      const assignment = await getStorage().getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Check permissions
      if (req.user.role === 'student') {
        // Students can only see their own submissions
        const submission = await getStorage().getSubmissionByAssignmentAndStudent(assignmentId, req.user.id);
        return res.json(submission ? [submission] : []);
      }
      
      // Teachers can see submissions for assignments they created
      if (req.user.role === 'teacher' && assignment.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const submissions = await getStorage().getSubmissionsByAssignment(assignmentId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/submissions/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Students can only view their own submissions unless they're admins/teachers
      if (req.user.id !== studentId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const submissions = await getStorage().getSubmissionsByStudent(studentId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/submissions', authenticateUser, requireRole(['student']), upload.single('file'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.body.assignmentId);
      const studentId = req.user.id;
      
      // Check if assignment exists
      const assignment = await getStorage().getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Check if student is enrolled in the subject
      const enrollments = await getStorage().getEnrollmentsByStudent(studentId);
      const isEnrolled = enrollments.some(e => e.subjectId === assignment.subjectId);
      
      if (!isEnrolled) {
        return res.status(403).json({ message: "You are not enrolled in this subject" });
      }
      
      // Check for existing submission
      const existingSubmission = await getStorage().getSubmissionByAssignmentAndStudent(assignmentId, studentId);
      
      // Prepare submission data
      const submissionData = {
        assignmentId,
        studentId,
        content: req.body.content || null,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : (existingSubmission?.fileUrl || null),
        status: 'completed' as const
      };
      
      let submission;
      
      // Update or create submission
      if (existingSubmission) {
        submission = await getStorage().updateSubmission(existingSubmission.id, submissionData);
      } else {
        submission = await getStorage().createSubmission(submissionData);
        
        // Notify the teacher
        const subject = await getStorage().getSubject(assignment.subjectId);
        if (subject?.teacherId) {
          await getStorage().createNotification({
            userId: subject.teacherId,
            title: "New Submission",
            content: `${req.user.firstName} ${req.user.lastName} has submitted ${assignment.title}.`,
            relatedId: submission.id,
            relatedType: "submission"
          });
        }
      }
      
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/submissions/:id/grade', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      const { grade, feedback } = req.body;
      
      // Get the submission
      const submission = await getStorage().getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Get the assignment
      const assignment = await getStorage().getAssignment(submission.assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Teachers can only grade submissions for their subjects
      if (req.user.role === 'teacher') {
        const subject = await getStorage().getSubject(assignment.subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      // Update submission with grade and feedback
      const updatedSubmission = await getStorage().updateSubmission(submissionId, {
        grade: parseInt(grade),
        feedback,
        status: 'graded'
      });
      
      // Create a grade record
      const gradeRecord = await getStorage().createGrade({
        studentId: submission.studentId,
        subjectId: assignment.subjectId,
        assignmentId: assignment.id,
        score: parseInt(grade),
        maxScore: 100, // Default max score
        comments: feedback || null
      });
      
      // Notify the student
      await getStorage().createNotification({
        userId: submission.studentId,
        title: "Assignment Graded",
        content: `Your submission for "${assignment.title}" has been graded.`,
        relatedId: submission.id,
        relatedType: "submission"
      });
      
      res.json(updatedSubmission);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Grade Routes
  app.get('/api/grades/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Students can only view their own grades unless they're admins/teachers
      if (req.user.id !== studentId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const grades = await getStorage().getGradesByStudent(studentId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/grades/subject/:subjectId', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const subjectId = parseInt(req.params.subjectId);
      
      // Check if the teacher has access to this subject
      if (req.user.role === 'teacher') {
        const subject = await getStorage().getSubject(subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const grades = await getStorage().getGradesBySubject(subjectId);
      res.json(grades);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/grades', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const gradeData = insertGradeSchema.parse(req.body);
      
      // Check if the teacher has access to this subject
      if (req.user.role === 'teacher') {
        const subject = await getStorage().getSubject(gradeData.subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const grade = await getStorage().createGrade(gradeData);
      
      // Notify the student
      await getStorage().createNotification({
        userId: gradeData.studentId,
        title: "New Grade Posted",
        content: `A new grade has been posted for your ${gradeData.subjectId} course.`,
        relatedId: grade.id,
        relatedType: "grade"
      });
      
      res.status(201).json(grade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/grades/:id', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const gradeId = parseInt(req.params.id);
      const grade = await getStorage().getGrade(gradeId);
      
      if (!grade) {
        return res.status(404).json({ message: "Grade not found" });
      }
      
      // Check if the teacher has access to this subject
      if (req.user.role === 'teacher') {
        const subject = await getStorage().getSubject(grade.subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const gradeData = insertGradeSchema.partial().parse(req.body);
      const updatedGrade = await getStorage().updateGrade(gradeId, gradeData);
      
      res.json(updatedGrade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Chat routes
  app.get('/api/users/chat', authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get all users except the current user
      const users = await getStorage().getUsers();
      const filteredUsers = users.filter(user => user.id !== req.user?.id);
      
      // Remove passwords from response
      const sanitizedUsers = filteredUsers.map(({ password, ...rest }) => rest);
      
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/messages/:userId', authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const otherUserId = parseInt(req.params.userId);
      const messages = await getStorage().getMessagesBetweenUsers(req.user.id, otherUserId);
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/messages/read', authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { messageIds } = req.body;
      
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: "Invalid message IDs" });
      }
      
      // Update each message status to 'read'
      const updatedMessages = await Promise.all(
        messageIds.map(id => getStorage().updateMessageStatus(id, "read"))
      );
      
      res.json(updatedMessages.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Request Routes
  app.get('/api/requests', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const requests = req.user.role === 'admin' 
        ? await getStorage().getRequests()
        : await getStorage().getPendingRequests();
      
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/requests/student/:studentId', authenticateUser, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Students can only view their own requests unless they're admins/teachers
      if (req.user.id !== studentId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const requests = await getStorage().getRequestsByStudent(studentId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/requests', authenticateUser, requireRole(['student']), async (req, res) => {
    try {
      const requestData = insertRequestSchema.parse({
        ...req.body,
        studentId: req.user.id
      });
      
      const request = await getStorage().createRequest(requestData);
      
      // Notify administrators
      const admins = (await getStorage().getUsers()).filter(user => user.role === 'admin');
      for (const admin of admins) {
        await getStorage().createNotification({
          userId: admin.id,
          title: "New Student Request",
          content: `${req.user.firstName} ${req.user.lastName} has submitted a ${requestData.type} request.`,
          relatedId: request.id,
          relatedType: "request"
        });
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
        req.user.id,
        resolution
      );
      
      // Notify the student
      await getStorage().createNotification({
        userId: request.studentId,
        title: "Request Status Update",
        content: `Your ${request.type} request has been ${status}.`,
        relatedId: request.id,
        relatedType: "request"
      });
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Document Routes
  app.get('/api/documents/user/:userId', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Students can only view their own documents unless they're admins/teachers
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const documents = await getStorage().getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/documents/user/:userId/type/:type', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const type = req.params.type;
      
      // Students can only view their own documents unless they're admins/teachers
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const documents = await getStorage().getDocumentsByType(userId, type);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/documents', authenticateUser, requireRole(['admin']), upload.single('file'), async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        createdBy: req.user.id,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null
      });
      
      const document = await getStorage().createDocument(documentData);
      
      // Notify the user
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
  
  // Notification Routes
  // GET /api/notifications - получить все уведомления для текущего пользователя
  app.get('/api/notifications', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`ROUTE: Getting notifications for user ${userId}, req.user:`, req.user);
      const notifications = await getStorage().getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // GET /api/notifications/unread - получить все непрочитанные уведомления для текущего пользователя
  app.get('/api/notifications/unread', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`ROUTE: Getting unread notifications for user ${userId}, req.user:`, req.user);
      const notifications = await getStorage().getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // POST /api/notifications/:id/read - отметить уведомление как прочитанное
  app.post('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      console.log(`ROUTE: Marking notification ${notificationId} as read`);
      
      // First make sure the notification exists and belongs to the current user
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== req.user.id) {
        console.log(`ROUTE: User ${req.user.id} tried to mark notification ${notificationId} as read but it belongs to user ${notification.userId}`);
        return res.status(403).json({ message: "You don't have permission to modify this notification" });
      }
      
      const updatedNotification = await getStorage().markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // DELETE /api/notifications/:id - удалить уведомление
  app.delete('/api/notifications/:id', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      console.log(`ROUTE: Deleting notification ${notificationId}`);
      
      // First make sure the notification exists and belongs to the current user
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== req.user.id) {
        console.log(`ROUTE: User ${req.user.id} tried to delete notification ${notificationId} but it belongs to user ${notification.userId}`);
        return res.status(403).json({ message: "You don't have permission to delete this notification" });
      }
      
      const success = await getStorage().deleteNotification(notificationId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete notification" });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // POST /api/notifications - создать новое уведомление
  app.post('/api/notifications', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const { userId, title, content, relatedId, relatedType } = req.body;
      
      if (!userId || !title || !content) {
        return res.status(400).json({ message: "userId, title and content are required" });
      }
      
      const notificationData = {
        userId,
        title,
        content,
        relatedId,
        relatedType
      };
      
      const notification = await getStorage().createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // PATCH /api/notifications/:id/read - отметить уведомление как прочитанное
  app.patch('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await getStorage().getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Users can only mark their own notifications as read
      if (req.user.id !== notification.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedNotification = await getStorage().markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // PATCH /api/notifications/read-all - отметить все уведомления пользователя как прочитанные
  app.patch('/api/notifications/read-all', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      await getStorage().markAllNotificationsAsRead(userId);
      res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Оставляем старые эндпоинты для обратной совместимости
  app.get('/api/notifications/user/:userId', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own notifications
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const notifications = await getStorage().getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/notifications/unread/user/:userId', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own notifications
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const notifications = await getStorage().getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // PUT маршрут удалён, так как клиент использует PATCH
  
  // Activity Logs Endpoints
  app.get('/api/activity-logs', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/activity-logs/type/:type', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const type = req.params.type;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogsByType(type, limit);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs by type:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/activity-logs/user/:userId', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const logs = await getStorage().getActivityLogsByUser(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs by user:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Tasks Routes
  app.get('/api/tasks', authenticateUser, async (req, res) => {
    try {
      const tasks = await getStorage().getTasks();
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error fetching tasks", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Curriculum Plans (Учебные планы) Routes
  app.get('/api/curriculum-plans', authenticateUser, async (req, res) => {
    try {
      const curriculumPlans = await getStorage().getCurriculumPlans();
      res.json(curriculumPlans);
    } catch (error) {
      console.error('Error fetching curriculum plans:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error fetching curriculum plans", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.get('/api/curriculum-plans/education-level/:level', authenticateUser, async (req, res) => {
    try {
      const level = req.params.level;
      
      // Проверяем, что уровень образования валидный
      const validLevels = ['СПО', 'ВО', 'Магистратура', 'Аспирантура'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ 
          message: "Invalid education level value", 
          details: `Education level must be one of: ${validLevels.join(', ')}`
        });
      }
      
      const plans = await getStorage().getCurriculumPlansByEducationLevel(level);
      res.json(plans);
    } catch (error) {
      console.error('Error fetching curriculum plans by education level:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error fetching curriculum plans by education level", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.get('/api/curriculum-plans/:id', authenticateUser, async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      
      if (isNaN(planId)) {
        return res.status(400).json({
          message: "Invalid curriculum plan ID",
          details: "Curriculum plan ID must be a valid number"
        });
      }
      
      const plan = await getStorage().getCurriculumPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ 
          message: "Curriculum plan not found",
          details: `No curriculum plan exists with ID ${planId}`
        });
      }
      
      res.json(plan);
    } catch (error) {
      console.error('Error fetching curriculum plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error fetching curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.post('/api/curriculum-plans', authenticateUser, requireRole(['admin', 'director']), async (req, res) => {
    try {
      // Валидируем данные с помощью схемы
      const { insertCurriculumPlanSchema } = await import('@shared/schema');
      
      // Модифицируем схему для добавления даты создания и обновления
      const modifiedSchema = insertCurriculumPlanSchema.extend({
        createdBy: z.number().optional()
      });
      
      console.log('Received curriculum plan data:', req.body);
      const planData = modifiedSchema.parse(req.body);
      console.log('Parsed curriculum plan data:', planData);
      
      // Добавляем id текущего пользователя как создателя
      if (!planData.createdBy) {
        planData.createdBy = req.user.id;
      }
      
      const plan = await getStorage().createCurriculumPlan(planData);
      
      // Создаем уведомление для всех администраторов
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      const directors = await storage.getUsersByRole('director');
      const allAdmins = [...admins, ...directors];
      
      // Отправляем уведомления всем администраторам, кроме текущего пользователя
      for (const admin of allAdmins) {
        if (admin.id !== req.user?.id) {
          await storage.createNotification({
            userId: admin.id,
            title: "Новый учебный план",
            content: `Добавлен новый учебный план "${planData.specialtyName}" (${planData.specialtyCode})`,
            relatedId: plan.id,
            relatedType: "curriculum_plan"
          });
        }
      }
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      console.error('Error creating curriculum plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error creating curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.put('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin', 'director']), async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      
      if (isNaN(planId)) {
        return res.status(400).json({
          message: "Invalid curriculum plan ID",
          details: "Curriculum plan ID must be a valid number"
        });
      }
      
      const plan = await getStorage().getCurriculumPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ 
          message: "Curriculum plan not found",
          details: `No curriculum plan exists with ID ${planId}`
        });
      }
      
      // Валидируем данные с помощью схемы
      const { insertCurriculumPlanSchema } = await import('@shared/schema');
      
      // Модифицируем схему для частичного обновления
      const modifiedSchema = insertCurriculumPlanSchema.partial();
      
      const planData = modifiedSchema.parse(req.body);
      console.log('Updating curriculum plan with data:', planData);
      
      const updatedPlan = await getStorage().updateCurriculumPlan(planId, planData);
      
      // Создаем уведомление для всех администраторов
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      const directors = await storage.getUsersByRole('director');
      const allAdmins = [...admins, ...directors];
      
      // Отправляем уведомления всем администраторам, кроме текущего пользователя
      for (const admin of allAdmins) {
        if (admin.id !== req.user?.id) {
          await storage.createNotification({
            userId: admin.id,
            title: "Обновлен учебный план",
            content: `Учебный план "${plan.specialtyName}" (${plan.specialtyCode}) был обновлен`,
            relatedId: plan.id,
            relatedType: "curriculum_plan"
          });
        }
      }
      
      res.json(updatedPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      console.error('Error updating curriculum plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error updating curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.delete('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin', 'director']), async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      
      if (isNaN(planId)) {
        return res.status(400).json({
          message: "Invalid curriculum plan ID",
          details: "Curriculum plan ID must be a valid number"
        });
      }
      
      const plan = await getStorage().getCurriculumPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ 
          message: "Curriculum plan not found",
          details: `No curriculum plan exists with ID ${planId}`
        });
      }
      
      // Удаляем учебный план
      const success = await getStorage().deleteCurriculumPlan(planId);
      
      if (!success) {
        return res.status(500).json({ 
          message: "Failed to delete curriculum plan",
          details: "An error occurred while attempting to delete the curriculum plan"
        });
      }
      
      // Создаем уведомление для всех администраторов
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      const directors = await storage.getUsersByRole('director');
      const allAdmins = [...admins, ...directors];
      
      // Отправляем уведомления всем администраторам, кроме текущего пользователя
      for (const admin of allAdmins) {
        if (admin.id !== req.user?.id) {
          await storage.createNotification({
            userId: admin.id,
            title: "Удален учебный план",
            content: `Учебный план "${plan.specialtyName}" (${plan.specialtyCode}) был удален`,
            relatedType: "curriculum_plan"
          });
        }
      }
      
      res.status(200).json({ 
        message: "Curriculum plan deleted successfully",
        planId: planId
      });
    } catch (error) {
      console.error('Error deleting curriculum plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error deleting curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.get('/api/tasks/client/:clientId', authenticateUser, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      // Только клиент или администратор может просматривать задачи клиента
      if (req.user.role !== 'admin' && req.user.id !== clientId) {
        return res.status(403).json({ message: "Forbidden - You can only view your own tasks" });
      }
      
      const tasks = await getStorage().getTasksByClient(clientId);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching client tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error fetching client tasks", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.get('/api/tasks/executor/:executorId', authenticateUser, async (req, res) => {
    try {
      const executorId = parseInt(req.params.executorId);
      
      // Только исполнитель или администратор может просматривать задачи исполнителя
      if (req.user.role !== 'admin' && req.user.id !== executorId) {
        return res.status(403).json({ message: "Forbidden - You can only view tasks assigned to you" });
      }
      
      const tasks = await getStorage().getTasksByExecutor(executorId);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching executor tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error fetching executor tasks", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.get('/api/tasks/status/:status', authenticateUser, async (req, res) => {
    try {
      const status = req.params.status;
      
      // Проверяем, что статус валидный
      const validStatuses = ['new', 'in_progress', 'completed', 'on_hold'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status value", 
          details: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      const tasks = await getStorage().getTasksByStatus(status);
      
      // Если пользователь не админ, фильтруем только те задачи, которые относятся к нему
      if (req.user.role !== 'admin') {
        const userId = req.user.id;
        const filteredTasks = tasks.filter(task => 
          task.clientId === userId || task.executorId === userId
        );
        return res.json(filteredTasks);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error fetching tasks by status", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.get('/api/tasks/due-soon/:days', authenticateUser, async (req, res) => {
    try {
      const days = parseInt(req.params.days);
      
      if (isNaN(days) || days < 0 || days > 30) {
        return res.status(400).json({ 
          message: "Invalid days parameter", 
          details: "The days parameter must be a number between 0 and 30"
        });
      }
      
      const tasks = await getStorage().getTasksDueSoon(days);
      
      // Если пользователь не админ, фильтруем только те задачи, которые относятся к нему
      if (req.user.role !== 'admin') {
        const userId = req.user.id;
        const filteredTasks = tasks.filter(task => 
          task.clientId === userId || task.executorId === userId
        );
        return res.json(filteredTasks);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching due soon tasks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error fetching tasks due soon", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.post('/api/tasks', authenticateUser, async (req, res) => {
    try {
      // Модифицируем схему вставки задачи для преобразования строки даты в объект Date
      const modifiedTaskSchema = insertTaskSchema.extend({
        dueDate: z.string().nullable().transform(val => val ? new Date(val) : null)
      });
      
      console.log('Received task data:', req.body);
      const taskData = modifiedTaskSchema.parse(req.body);
      console.log('Parsed task data:', taskData);
      
      // Устанавливаем текущего пользователя как клиента, если не указано иное
      if (!taskData.clientId) {
        taskData.clientId = req.user.id;
      }
      
      // Администраторы могут создавать задачи от имени любого пользователя
      // Обычные пользователи могут создавать задачи только от своего имени
      if (req.user.role !== 'admin' && taskData.clientId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden - You can only create tasks on your own behalf", 
          details: "Regular users can only create tasks where they are the client"
        });
      }
      
      const task = await getStorage().createTask(taskData);
      
      // Создаем уведомление для исполнителя
      await getStorage().createNotification({
        userId: task.executorId,
        title: "New Task Assigned",
        content: `You have been assigned a new task: ${task.title}`,
        relatedId: task.id,
        relatedType: "task"
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      console.error('Error creating task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error creating task", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Endpoint для удаления задачи
  app.delete('/api/tasks/:id', authenticateUser, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await getStorage().getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ 
          message: "Task not found", 
          details: `No task exists with ID ${taskId}`
        });
      }
      
      // Проверяем права на удаление
      // Только создатель задачи (клиент) или администратор может удалить задачу
      if (req.user.role !== 'admin' && req.user.id !== task.clientId) {
        return res.status(403).json({ 
          message: "Forbidden - Only task creators or admins can delete tasks",
          details: "You don't have permission to delete this task" 
        });
      }
      
      // Удаляем задачу
      await getStorage().deleteTask(taskId);
      
      // Уведомляем исполнителя о удалении задачи, если задача была назначена
      if (task.executorId && task.executorId !== req.user.id) {
        await getStorage().createNotification({
          userId: task.executorId,
          title: "Task Deleted",
          content: `Task "${task.title}" has been deleted`,
          relatedType: "task"
        });
      }
      
      // Отправляем успешный ответ
      res.status(200).json({ 
        message: "Task deleted successfully",
        taskId: taskId
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error deleting task", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.put('/api/tasks/:id', authenticateUser, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await getStorage().getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ 
          message: "Task not found", 
          details: `No task exists with ID ${taskId}`
        });
      }
      
      // Check permission to edit the task
      // Only the task creator (client) or admin can edit the task
      if (req.user.role !== 'admin' && req.user.id !== task.clientId) {
        // Allow executor to change status only, not other fields
        if (req.user.id === task.executorId && Object.keys(req.body).length === 1 && 'status' in req.body) {
          // Executor can only update status
        } else {
          return res.status(403).json({ 
            message: "Forbidden - Only task creators or admins can edit tasks",
            details: "Task executors can only update the status field" 
          });
        }
      }
      
      // Модифицируем схему для обновления задачи, чтобы обрабатывать строковые даты
      const modifiedUpdateTaskSchema = insertTaskSchema.partial().extend({
        dueDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null)
      });
      
      const taskData = modifiedUpdateTaskSchema.parse(req.body);
      
      // Ограничиваем поля, которые может изменить исполнитель
      if (req.user.role !== 'admin' && req.user.id === task.executorId && req.user.id !== task.clientId) {
        // Исполнитель может изменить только статус и, возможно, добавить описание
        const allowedFields = ['status', 'description'];
        const providedFields = Object.keys(taskData);
        
        const disallowedFields = providedFields.filter(field => !allowedFields.includes(field));
        if (disallowedFields.length > 0) {
          return res.status(403).json({ 
            message: "Forbidden - As an executor, you can only update status and description",
            disallowedFields,
            details: `Attempted to update restricted fields: ${disallowedFields.join(', ')}`
          });
        }
      }
      
      const updatedTask = await getStorage().updateTask(taskId, taskData);
      
      // Создаем уведомление о обновлении задачи
      if (task.status !== taskData.status && taskData.status) {
        // Специальное уведомление для завершенных задач
        if (taskData.status === 'completed') {
          // Уведомляем клиента о завершении задачи
          await getStorage().createNotification({
            userId: task.clientId,
            title: "Task Completed",
            content: `Task "${task.title}" has been marked as completed`,
            relatedId: task.id,
            relatedType: "task"
          });
          
          // Уведомление для администраторов
          const admins = await getStorage().getUsersByRole('admin');
          for (const admin of admins) {
            // Не отправляем уведомление админу, если он уже является клиентом или исполнителем задачи
            if (admin.id !== task.clientId && admin.id !== task.executorId) {
              await getStorage().createNotification({
                userId: admin.id,
                title: "Task Completed",
                content: `Task "${task.title}" has been marked as completed`,
                relatedId: task.id,
                relatedType: "task"
              });
            }
          }
        } else {
          // Обычное уведомление об изменении статуса
          // Уведомляем клиента, если исполнитель обновил статус
          if (req.user.id === task.executorId) {
            await getStorage().createNotification({
              userId: task.clientId,
              title: "Task Status Updated",
              content: `Status of task "${task.title}" has been updated to ${taskData.status}`,
              relatedId: task.id,
              relatedType: "task"
            });
          } 
          // Уведомляем исполнителя, если клиент обновил статус
          else if (req.user.id === task.clientId) {
            await getStorage().createNotification({
              userId: task.executorId,
              title: "Task Status Updated",
              content: `Status of task "${task.title}" has been updated to ${taskData.status}`,
              relatedId: task.id,
              relatedType: "task"
            });
          }
        }
      }
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors,
          timestamp: new Date().toISOString() 
        });
      }
      console.error('Error updating task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error updating task", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  

  
  // Этот маршрут должен быть определен после всех других маршрутов с параметрами, 
  // чтобы избежать конфликтов с маршрутами tasks/client, tasks/executor и т.д.
  app.get('/api/tasks/:id', authenticateUser, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({
          message: "Invalid task ID",
          details: "Task ID must be a valid number"
        });
      }
      
      const task = await getStorage().getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ 
          message: "Task not found",
          details: `No task exists with ID ${taskId}`
        });
      }
      
      // Проверяем, имеет ли пользователь право на просмотр этой задачи
      if (req.user.role !== 'admin' && req.user.id !== task.clientId && req.user.id !== task.executorId) {
        return res.status(403).json({ 
          message: "Forbidden",
          details: "You can only view tasks where you are the client, executor, or an admin"
        });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Error fetching task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      res.status(500).json({ 
        message: "Error fetching task", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/users/:id/tasks - получить все задачи пользователя (как клиента, так и исполнителя)
  app.get('/api/users/:id/tasks', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Админ может видеть задачи любых пользователей
      // Другие пользователи - только свои
      if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Получаем задачи, где пользователь является клиентом или исполнителем
      const clientTasks = await getStorage().getTasksByClient(userId);
      const executorTasks = await getStorage().getTasksByExecutor(userId);
      
      // Объединяем все задачи в один массив
      const allTasks = [...clientTasks, ...executorTasks];
      
      // Удаляем дубликаты (если пользователь одновременно является и клиентом, и исполнителем)
      const uniqueTasks = allTasks.filter((task, index, self) => 
        index === self.findIndex((t) => t.id === task.id)
      );
      
      res.json(uniqueTasks);
    } catch (error) {
      console.error('Error getting tasks for user:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // GET /api/users/:id/notifications - получить все уведомления пользователя
  app.get('/api/users/:id/notifications', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Админ может видеть уведомления любых пользователей
      // Другие пользователи - только свои
      if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const notifications = await getStorage().getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications for user:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // PATCH /api/tasks/:id/status - обновить статус задачи
  app.patch('/api/tasks/:id/status', authenticateUser, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['new', 'in_progress', 'completed', 'on_hold'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Получаем текущую задачу
      const task = await getStorage().getTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Проверяем права доступа: только админ, клиент или исполнитель задачи могут менять статус
      if (req.user?.role !== 'admin' && req.user?.id !== task.clientId && req.user?.id !== task.executorId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Обновляем статус задачи
      const updatedTask = await getStorage().updateTask(taskId, { status });
      
      // Создаем уведомление о смене статуса задачи
      if (status === 'completed' && task.clientId) {
        // Уведомление для клиента о выполнении задачи
        await getStorage().createNotification({
          userId: task.clientId,
          title: "Задача выполнена",
          content: `Задача "${task.title}" отмечена как выполненная.`,
          isRead: false,
          relatedId: taskId,
          relatedType: 'task'
        });
        
        console.log(`DB: Created notification for user ${task.clientId}`);
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // GET /api/documents - получить документы (заглушка для будущей функциональности)
  app.get('/api/documents', authenticateUser, async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      // Временно возвращаем пустой массив, т.к. функциональность документов еще не реализована
      res.json([]);
    } catch (error) {
      console.error('Error getting documents:', error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  return httpServer;
}

// Add user property to Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
