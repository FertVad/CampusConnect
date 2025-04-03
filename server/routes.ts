import type { Express, Response, NextFunction, Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  User
} from "@shared/schema";
import { object, string, z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
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
  // Подробное логирование сессии для отладки проблем аутентификации
  console.log(`Auth check - Session ID: ${req.sessionID}`);
  console.log(`Auth check - Is Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'method undefined'}`);
  
  // Проверяем как метод isAuthenticated, так и наличие объекта пользователя
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    console.log(`User authenticated: ${req.user.id} (${req.user.role})`);
    return next();
  }
  
  // Если нет сессии или пользователя, возвращаем ошибку 401
  return res.status(401).json({ message: "Unauthorized - Please log in" });
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
    const teachers = await storage.getUsersByRole('teacher');
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
          const messages = await storage.getMessagesByUser(userId);
          const undeliveredMessages = messages.filter(m => 
            m.toUserId === userId && m.status === 'sent'
          );
          
          for (const message of undeliveredMessages) {
            // Mark as delivered
            await storage.updateMessageStatus(message.id, 'delivered');
            
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
          const message = await storage.createMessage({
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
            await storage.updateMessageStatus(message.id, 'delivered');
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
          await storage.updateMessageStatus(messageId, 'read');
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
      const users = await storage.getUsers();
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
      
      const user = await storage.getUser(userId);
      
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
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/users/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/users/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.deleteUser(userId);
      
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
      const subjects = await storage.getSubjects();
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/subjects/:id', authenticateUser, async (req, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      const subject = await storage.getSubject(subjectId);
      
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
      
      const subjects = await storage.getSubjectsByTeacher(req.user.id);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/subjects', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const subjectData = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(subjectData);
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
      const updatedSubject = await storage.updateSubject(subjectId, subjectData);
      
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
      const success = await storage.deleteSubject(subjectId);
      
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
      const enrollments = await storage.getEnrollments();
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
      
      const enrollments = await storage.getEnrollmentsByStudent(studentId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/enrollments/subject/:subjectId', authenticateUser, async (req, res) => {
    try {
      const subjectId = parseInt(req.params.subjectId);
      const enrollments = await storage.getEnrollmentsBySubject(subjectId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/enrollments', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const enrollmentData = insertEnrollmentSchema.parse(req.body);
      const enrollment = await storage.createEnrollment(enrollmentData);
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
      const success = await storage.deleteEnrollment(enrollmentId);
      
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
      const schedule = await storage.getScheduleItems();
      
      // Получаем информацию о предметах и преподавателях для каждого элемента расписания
      const enrichedSchedule = await Promise.all(schedule.map(async (item) => {
        let subject = await storage.getSubject(item.subjectId);
        
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
          const teacher = await storage.getUser(subject.teacherId);
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
      
      const schedule = await storage.getScheduleItemsByStudent(studentId);
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
      const schedule = await storage.getScheduleItemsByStudent(req.user.id);
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
      
      const schedule = await storage.getScheduleItemsByTeacher(teacherId);
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
      const schedule = await storage.getScheduleItemsByTeacher(req.user.id);
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
      const scheduleItem = await storage.createScheduleItem(scheduleData);
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
      const updatedSchedule = await storage.updateScheduleItem(scheduleId, scheduleData);
      
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
      const success = await storage.deleteScheduleItem(scheduleId);
      
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
      const allSubjects = await storage.getSubjects();
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
            const newSubject = await storage.createSubject({
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
        const created = await storage.createScheduleItem(cleanItem);
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
        const gsheetFileInfo = await storage.createImportedFile({
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
          await storage.updateScheduleItem(item.id, {
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
        const allSubjects = await storage.getSubjects();
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
              const newSubject = await storage.createSubject({
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
          const created = await storage.createScheduleItem(cleanItem);
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
          const importFileInfo = await storage.createImportedFile({
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
            await storage.updateScheduleItem(item.id, {
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
      const files = await storage.getImportedFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/imported-files/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getImportedFile(id);
      
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
      const files = await storage.getImportedFilesByUser(userId);
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
      
      const files = await storage.getImportedFilesByType(type);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete('/api/imported-files/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getImportedFile(id);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Delete the actual file from the filesystem if it exists and is a CSV file
      if (file.filePath && file.importType === 'csv') {
        const fullPath = path.join(process.cwd(), file.filePath);
        try {
          await fs.promises.access(fullPath);
          await fs.promises.unlink(fullPath);
        } catch (err) {
          console.error(`Could not delete file ${fullPath}:`, err);
          // Continue with deleting the database record even if the file doesn't exist
        }
      }
      
      // Delete the database record
      const success = await storage.deleteImportedFile(id);
      
      if (success) {
        res.status(200).json({ message: "File deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete file" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Assignment Routes
  app.get('/api/assignments', authenticateUser, requireRole(['admin', 'teacher']), async (req, res) => {
    try {
      const assignments = await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/assignments/:id', authenticateUser, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.getAssignment(assignmentId);
      
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
      
      const assignments = await storage.getAssignmentsByStudent(studentId);
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
      const assignments = await storage.getAssignmentsByStudent(req.user.id);
      
      // Get all submissions by this student
      const submissions = await storage.getSubmissionsByStudent(req.user.id);
      
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
      
      const assignments = await storage.getAssignmentsByTeacher(teacherId);
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
      const assignments = await storage.getAssignmentsByTeacher(req.user.id);
      
      // For each assignment, get submissions count and other details
      const assignmentsWithDetails = await Promise.all(assignments.map(async assignment => {
        const submissions = await storage.getSubmissionsByAssignment(assignment.id);
        
        // Get subject details
        const subject = await storage.getSubject(assignment.subjectId);
        
        // Get student count for this subject
        const students = await storage.getStudentsBySubject(assignment.subjectId);
        
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
      const assignment = await storage.createAssignment(assignmentData);
      
      // Create notifications for students in this subject
      const students = await storage.getStudentsBySubject(assignmentData.subjectId);
      for (const student of students) {
        await storage.createNotification({
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
      const assignment = await storage.getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Teachers can only edit their own assignments unless they're admins
      if (req.user.role === 'teacher' && assignment.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const assignmentData = insertAssignmentSchema.partial().parse(req.body);
      const updatedAssignment = await storage.updateAssignment(assignmentId, assignmentData);
      
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
      const assignment = await storage.getAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Teachers can only delete their own assignments unless they're admins
      if (req.user.role === 'teacher' && assignment.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteAssignment(assignmentId);
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
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Check permissions
      if (req.user.role === 'student') {
        // Students can only see their own submissions
        const submission = await storage.getSubmissionByAssignmentAndStudent(assignmentId, req.user.id);
        return res.json(submission ? [submission] : []);
      }
      
      // Teachers can see submissions for assignments they created
      if (req.user.role === 'teacher' && assignment.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const submissions = await storage.getSubmissionsByAssignment(assignmentId);
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
      
      const submissions = await storage.getSubmissionsByStudent(studentId);
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
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Check if student is enrolled in the subject
      const enrollments = await storage.getEnrollmentsByStudent(studentId);
      const isEnrolled = enrollments.some(e => e.subjectId === assignment.subjectId);
      
      if (!isEnrolled) {
        return res.status(403).json({ message: "You are not enrolled in this subject" });
      }
      
      // Check for existing submission
      const existingSubmission = await storage.getSubmissionByAssignmentAndStudent(assignmentId, studentId);
      
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
        submission = await storage.updateSubmission(existingSubmission.id, submissionData);
      } else {
        submission = await storage.createSubmission(submissionData);
        
        // Notify the teacher
        const subject = await storage.getSubject(assignment.subjectId);
        if (subject?.teacherId) {
          await storage.createNotification({
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
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Get the assignment
      const assignment = await storage.getAssignment(submission.assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Teachers can only grade submissions for their subjects
      if (req.user.role === 'teacher') {
        const subject = await storage.getSubject(assignment.subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      // Update submission with grade and feedback
      const updatedSubmission = await storage.updateSubmission(submissionId, {
        grade: parseInt(grade),
        feedback,
        status: 'graded'
      });
      
      // Create a grade record
      const gradeRecord = await storage.createGrade({
        studentId: submission.studentId,
        subjectId: assignment.subjectId,
        assignmentId: assignment.id,
        score: parseInt(grade),
        maxScore: 100, // Default max score
        comments: feedback || null
      });
      
      // Notify the student
      await storage.createNotification({
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
      
      const grades = await storage.getGradesByStudent(studentId);
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
        const subject = await storage.getSubject(subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const grades = await storage.getGradesBySubject(subjectId);
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
        const subject = await storage.getSubject(gradeData.subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const grade = await storage.createGrade(gradeData);
      
      // Notify the student
      await storage.createNotification({
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
      const grade = await storage.getGrade(gradeId);
      
      if (!grade) {
        return res.status(404).json({ message: "Grade not found" });
      }
      
      // Check if the teacher has access to this subject
      if (req.user.role === 'teacher') {
        const subject = await storage.getSubject(grade.subjectId);
        if (subject?.teacherId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const gradeData = insertGradeSchema.partial().parse(req.body);
      const updatedGrade = await storage.updateGrade(gradeId, gradeData);
      
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
      const users = await storage.getUsers();
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
      const messages = await storage.getMessagesBetweenUsers(req.user.id, otherUserId);
      
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
        messageIds.map(id => storage.updateMessageStatus(id, "read"))
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
        ? await storage.getRequests()
        : await storage.getPendingRequests();
      
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
      
      const requests = await storage.getRequestsByStudent(studentId);
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
      
      const request = await storage.createRequest(requestData);
      
      // Notify administrators
      const admins = (await storage.getUsers()).filter(user => user.role === 'admin');
      for (const admin of admins) {
        await storage.createNotification({
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
      
      const request = await storage.getRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      const updatedRequest = await storage.updateRequestStatus(
        requestId, 
        status as 'approved' | 'rejected',
        req.user.id,
        resolution
      );
      
      // Notify the student
      await storage.createNotification({
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
      
      const documents = await storage.getDocumentsByUser(userId);
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
      
      const documents = await storage.getDocumentsByType(userId, type);
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
      
      const document = await storage.createDocument(documentData);
      
      // Notify the user
      await storage.createNotification({
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
  app.get('/api/notifications/user/:userId', authenticateUser, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own notifications
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const notifications = await storage.getNotificationsByUser(userId);
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
      
      const notifications = await storage.getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Users can only mark their own notifications as read
      if (req.user.id !== notification.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
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
