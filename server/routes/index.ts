import type { Express, Response, NextFunction, Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "../storage";
import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
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

export interface RouteContext {
  authenticateUser: typeof authenticateUser;
  requireRole: typeof requireRole;
  upload: typeof upload;
}

// Auth middleware - Use passport.js authentication
const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Подробное логирование сессии для отладки проблем аутентификации
    console.log(`Auth check - Session ID: ${req.sessionID}`);
    console.log(`Auth check - Is Authenticated: ${req.isAuthenticated ? req.isAuthenticated() : 'method undefined'}`);
    console.log(`Auth check - User: ${req.user ? JSON.stringify({ id: req.user.id, role: req.user.role }) : 'undefined'}`);
    console.log(`Auth check - Cookies: ${req.headers.cookie}`);
    console.log(`Auth check - Session data:`, req.session);
    
    // Если пользователь аутентифицирован через passport, пропускаем
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log(`User authenticated normally: ${req.user.id} (${req.user.role})`);
      
      // Принудительно сохраняем сессию при каждом запросе
      if (req.session) {
        req.session.touch();
      }
      
      return next();
    }
    
    // Проверяем данные в сессии напрямую
    if (req.session && req.session.passport && req.session.passport.user) {
      console.log(`Auth check - Session contains user ID: ${req.session.passport.user}`);
      
      try {
        // Попытка восстановить пользователя из ID в сессии
        const userId = req.session.passport.user;
        const user = await getStorage().getUser(userId);
        
        if (user) {
          console.log(`Auth check - Recovered user from session: ${user.id} (${user.role})`);
          (req as any).user = user; // Восстанавливаем пользователя
          return next();
        }
      } catch (err) {
        console.error("Error recovering user from session:", err);
      }
    }
    
    // Делаем финальную проверку cookie для отладки
    if (!req.headers.cookie || !req.headers.cookie.includes('eduportal.sid')) {
      console.warn(`Auth failed - No session cookie found in request`);
    }
    
    // Если все способы восстановления сессии не удались, возвращаем 401
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

  const ctx: RouteContext = { authenticateUser, requireRole, upload };
  registerUserRoutes(app, ctx);
  registerScheduleRoutes(app, ctx);
  registerTaskRoutes(app, ctx);

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
      const notifications = await getStorage().getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // GET /api/notifications/unread - получить все непрочитанные уведомления для текущего пользователя
  app.get('/api/notifications/unread', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const notifications = await getStorage().getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // POST /api/notifications/:id/read - отметить уведомление как прочитанное
  app.post('/api/notifications/:id/read', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      // First make sure the notification exists and belongs to the current user
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to modify this notification" });
      }
      
      const updatedNotification = await getStorage().markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // DELETE /api/notifications/:id - удалить уведомление
  app.delete('/api/notifications/:id', authenticateUser, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      // First make sure the notification exists and belongs to the current user
      const notification = await getStorage().getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this notification" });
      }
      
      const success = await getStorage().deleteNotification(notificationId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete notification" });
      }
    } catch (error) {
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
  
  // Curriculum Plans (Учебные планы) Routes
  app.get('/api/curriculum-plans', authenticateUser, async (req, res) => {
    try {
      // Получаем актуальное хранилище и создаем временные данные для тестирования
      // Пример базовых учебных планов для временного использования
      const defaultPlans = [
        {
          id: 1,
          specialtyName: "Информатика и вычислительная техника",
          specialtyCode: "09.03.01",
          yearsOfStudy: 4,
          educationLevel: "ВО",
          description: "Бакалавриат по информатике и вычислительной технике",
          createdBy: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          specialtyName: "Экономика и управление",
          specialtyCode: "38.03.01",
          yearsOfStudy: 4,
          educationLevel: "ВО",
          description: "Бакалавриат по экономике и управлению",
          createdBy: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          specialtyName: "Программирование в компьютерных системах",
          specialtyCode: "09.02.03",
          yearsOfStudy: 3,
          educationLevel: "СПО",
          description: "Программирование в компьютерных системах (СПО)",
          createdBy: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      let curriculumPlans = [];
      
      try {
        // Получение хранилища и проверка наличия метода
        const storage = getStorage();
        
        if (typeof storage.getCurriculumPlans === 'function') {
          curriculumPlans = await storage.getCurriculumPlans();
        } else {
          curriculumPlans = defaultPlans;
        }
      } catch (storageError) {
        curriculumPlans = defaultPlans;
      }
      
      // Отправляем ответ
      res.json(curriculumPlans);
    } catch (error) {
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
      
      // Создаем fallback-данные для случая недоступности хранилища
      const defaultPlansByLevel = [
        {
          id: 3,
          specialtyName: "Программирование в компьютерных системах",
          specialtyCode: "09.02.03",
          yearsOfStudy: 3,
          educationLevel: "СПО",
          description: "Программирование в компьютерных системах (СПО)",
          createdBy: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      let plans = [];
      
      try {
        // Получение хранилища и проверка наличия метода
        const storage = getStorage();
        
        if (typeof storage.getCurriculumPlansByEducationLevel === 'function') {
          plans = await storage.getCurriculumPlansByEducationLevel(level);
          console.log(`Retrieved ${plans.length} curriculum plans with education level ${level}`);
        } else {
          console.warn("Warning: storage.getCurriculumPlansByEducationLevel not found");
          console.log("Using default plans data for education level");
          plans = defaultPlansByLevel.filter(p => p.educationLevel === level);
        }
      } catch (storageError) {
        console.error("Storage error when fetching plans by education level:", storageError);
        plans = defaultPlansByLevel.filter(p => p.educationLevel === level);
      }
      
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
      
      // Получение плана
      const memStorage = getStorage();
      let plan = null;
      
      // Проверка наличия метода getCurriculumPlan
      if (typeof memStorage.getCurriculumPlan === 'function') {
        plan = await memStorage.getCurriculumPlan(planId);
      } else {
        // Альтернативный доступ, если метод отсутствует
        const allPlans = await memStorage.getCurriculumPlans();
        plan = allPlans.find(p => p.id === planId);
      }
      
      if (!plan) {
        return res.status(404).json({ 
          message: "Curriculum plan not found",
          details: `No curriculum plan exists with ID ${planId}`
        });
      }
      
      res.json(plan);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({ 
        message: "Error fetching curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  app.post('/api/curriculum-plans', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      // Валидируем данные с помощью схемы
      const { insertCurriculumPlanSchema } = await import('@shared/schema');
      
      // Модифицируем схему для добавления даты создания и обновления
      const modifiedSchema = insertCurriculumPlanSchema.extend({
        createdBy: z.number().optional()
      });
      
      const planData = modifiedSchema.parse(req.body);
      
      // Добавляем id текущего пользователя как создателя
      if (!planData.createdBy) {
        planData.createdBy = req.user.id;
      }
      
      const plan = await getStorage().createCurriculumPlan(planData);
      
      // Создаем уведомление для всех администраторов
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      // Удаляем запрос на директоров - эта роль вызывает ошибку в базе данных
      // const directors = await storage.getUsersByRole('director');
      // const allAdmins = [...admins, ...directors];
      
      // Отправляем уведомления всем администраторам, кроме текущего пользователя
      for (const admin of admins) {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error creating curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Общая функция обновления учебного плана
  const updateCurriculumPlan = async (req: Request, res: Response) => {
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
      
      // Получаем данные плана из тела запроса
      const bodyData = req.body;
      
      // Удаляем служебное поле _method, если оно присутствует
      if (bodyData._method) {
        delete bodyData._method;
      }
      
      const planData = modifiedSchema.parse(bodyData);
      
      console.log(`[updateCurriculumPlan] Updating plan ${planId} with data:`, planData);
      
      const updatedPlan = await getStorage().updateCurriculumPlan(planId, planData);
      
      // Создаем уведомление для всех администраторов
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      
      // Удаляем запрос на директоров - эта роль вызывает ошибку в базе данных
      // const directors = await storage.getUsersByRole('director');
      // const allAdmins = [...admins, ...directors];
      
      // Отправляем уведомления всем администраторам, кроме текущего пользователя
      for (const admin of admins) {
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
      
      console.log(`[updateCurriculumPlan] Updated plan:`, updatedPlan);
      res.json(updatedPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[updateCurriculumPlan] Error:`, error);
      res.status(500).json({ 
        message: "Error updating curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // PUT обработчик для обновления учебного плана
  app.put('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), updateCurriculumPlan);
  
  // PATCH обработчик для унифицированного сохранения всех данных учебного плана
  app.patch('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), updateCurriculumPlan);
  
  // POST обработчик как альтернатива PUT (для клиентов, где PUT не работает)
  app.post('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), (req, res) => {
    // Проверяем, есть ли в теле запроса поле _method со значением PUT
    if (req.body._method === 'PUT') {
      return updateCurriculumPlan(req, res);
    }
    
    // Если _method не равен PUT, возвращаем ошибку
    return res.status(400).json({
      message: "Invalid request method",
      details: "Expected _method=PUT in the request body"
    });
  });
  
  app.delete('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
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
      
      // Удаляем запрос на директоров - эта роль вызывает ошибку в базе данных
      // const directors = await storage.getUsersByRole('director');
      // const allAdmins = [...admins, ...directors];
      
      // Отправляем уведомления всем администраторам, кроме текущего пользователя
      for (const admin of admins) {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error deleting curriculum plan", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
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

  // API для сохранения данных календаря через useAutoSave
  app.post('/api/curriculum/weeks', authenticateUser, async (req, res) => {
    try {
      // Получаем данные и план ID из запроса
      console.log('[DEBUG - /api/curriculum/weeks]', 'Request body:', req.body);
      
      const { planId, calendarData } = req.body;
      
      if (!planId) {
        return res.status(400).json({
          message: "Missing plan ID",
          details: "A planId is required"
        });
      }
      
      const id = parseInt(planId);
      if (isNaN(id)) {
        return res.status(400).json({
          message: "Invalid plan ID",
          details: "Plan ID must be a valid number"
        });
      }
      
      // Получаем учебный план
      const plan = await getStorage().getCurriculumPlan(id);
      if (!plan) {
        return res.status(404).json({
          message: "Curriculum plan not found",
          details: `No plan found with ID ${id}`
        });
      }
      
      // Сохраняем данные календаря
      const calendarDataString = JSON.stringify(calendarData);
      console.log('[DEBUG - /api/curriculum/weeks]', 'Saving calendarData for planId:', id);
      
      const updatedPlan = await getStorage().updateCurriculumPlan(id, {
        calendarData: calendarDataString
      });
      
      return res.json({
        success: true,
        message: "Calendar data saved",
        plan: updatedPlan
      });
    } catch (error) {
      console.error('Error saving calendar data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        message: "Error saving calendar data",
        details: errorMessage
      });
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
