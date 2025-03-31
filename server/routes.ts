import type { Express, Request, Response } from "express";
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
  insertMessageSchema, insertNotificationSchema
} from "@shared/schema";
import { object, string, z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Set up file upload storage
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '../uploads');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

// Auth middleware
const authenticateUser = async (req: Request, res: Response, next: Function) => {
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized - Missing user ID" });
  }
  
  const user = await storage.getUser(Number(userId));
  
  if (!user) {
    return res.status(401).json({ message: "Unauthorized - Invalid user ID" });
  }
  
  // Attach user to request
  req.user = user;
  next();
};

// Role check middleware
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }
    
    next();
  };
};

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
  app.get('/api/schedule', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const schedule = await storage.getScheduleItems();
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
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
