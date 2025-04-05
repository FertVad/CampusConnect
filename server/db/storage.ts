import { db } from './index';
import * as schema from '@shared/schema';
import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import { IStorage } from '../storage';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';

const { Pool } = pg;
import {
  User, InsertUser, Subject, InsertSubject, Enrollment, InsertEnrollment,
  ScheduleItem, InsertScheduleItem, Assignment, InsertAssignment,
  Submission, InsertSubmission, Grade, InsertGrade, Request, InsertRequest,
  Document, InsertDocument, Message, InsertMessage, Notification, InsertNotification,
  LoginCredentials, ImportedFile, InsertImportedFile, ActivityLog, InsertActivityLog,
  Task, InsertTask
} from '@shared/schema';
import { testConnection } from './index';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { log } from '../vite';

const MemoryStore = createMemoryStore(session);
const PgSession = connectPgSimple(session);

/**
 * A PostgreSQL-backed implementation of the IStorage interface
 */
export class PostgresStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Use MemoryStore for session storage for better reliability in Replit environment
    // This is simpler but will lose sessions on server restart
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
      stale: false, // Don't allow stale sessions
    });
    
    log("Using in-memory session storage for better reliability");
  }

  // User management
  async getUsers(): Promise<User[]> {
    return db.select().from(schema.users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const users = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return users[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await db.select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return users[0];
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return db.select()
      .from(schema.users)
      .where(eq(schema.users.role, role as any));
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash the password before storing it
    const hashedPassword = await this.hashPassword(userData.password);
    
    const [user] = await db.insert(schema.users)
      .values({
        ...userData,
        password: hashedPassword
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // If password is being updated, hash it
    if (userData.password) {
      userData.password = await this.hashPassword(userData.password);
    }
    
    const [user] = await db.update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, id))
      .returning();
    
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(schema.users)
      .where(eq(schema.users.id, id));
    
    return result.rowCount > 0;
  }

  async authenticate(credentials: LoginCredentials): Promise<User | undefined> {
    const user = await this.getUserByEmail(credentials.email);
    
    if (!user) {
      return undefined;
    }
    
    const isValid = await this.comparePasswords(credentials.password, user.password);
    
    if (!isValid) {
      return undefined;
    }
    
    return user;
  }

  // Helper methods for password hashing
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    return bcrypt.compare(supplied, stored);
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return db.select().from(schema.subjects);
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const subjects = await db.select()
      .from(schema.subjects)
      .where(eq(schema.subjects.id, id))
      .limit(1);
    return subjects[0];
  }

  async getSubjectsByTeacher(teacherId: number): Promise<Subject[]> {
    return db.select()
      .from(schema.subjects)
      .where(eq(schema.subjects.teacherId, teacherId));
  }

  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const [subject] = await db.insert(schema.subjects)
      .values(subjectData)
      .returning();
    
    return subject;
  }

  async updateSubject(id: number, subjectData: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [subject] = await db.update(schema.subjects)
      .set(subjectData)
      .where(eq(schema.subjects.id, id))
      .returning();
    
    return subject;
  }

  async deleteSubject(id: number): Promise<boolean> {
    const result = await db.delete(schema.subjects)
      .where(eq(schema.subjects.id, id));
    
    return result.rowCount > 0;
  }

  // Enrollments
  async getEnrollments(): Promise<Enrollment[]> {
    return db.select().from(schema.enrollments);
  }

  async getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]> {
    return db.select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.studentId, studentId));
  }

  async getEnrollmentsBySubject(subjectId: number): Promise<Enrollment[]> {
    return db.select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.subjectId, subjectId));
  }

  async getStudentsBySubject(subjectId: number): Promise<User[]> {
    return db.select()
      .from(schema.users)
      .innerJoin(
        schema.enrollments,
        and(
          eq(schema.users.id, schema.enrollments.studentId),
          eq(schema.enrollments.subjectId, subjectId)
        )
      )
      .where(eq(schema.users.role, 'student'))
      .orderBy(schema.users.lastName, schema.users.firstName);
  }

  async getSubjectsByStudent(studentId: number): Promise<Subject[]> {
    return db.select()
      .from(schema.subjects)
      .innerJoin(
        schema.enrollments,
        and(
          eq(schema.subjects.id, schema.enrollments.subjectId),
          eq(schema.enrollments.studentId, studentId)
        )
      )
      .orderBy(schema.subjects.name);
  }

  async createEnrollment(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db.insert(schema.enrollments)
      .values(enrollmentData)
      .returning();
    
    return enrollment;
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    const result = await db.delete(schema.enrollments)
      .where(eq(schema.enrollments.id, id));
    
    return result.rowCount > 0;
  }

  // Schedule
  async getScheduleItems(): Promise<ScheduleItem[]> {
    return db.select().from(schema.scheduleItems);
  }

  async getScheduleItem(id: number): Promise<ScheduleItem | undefined> {
    const items = await db.select()
      .from(schema.scheduleItems)
      .where(eq(schema.scheduleItems.id, id))
      .limit(1);
    return items[0];
  }

  async getScheduleItemsBySubject(subjectId: number): Promise<ScheduleItem[]> {
    return db.select()
      .from(schema.scheduleItems)
      .where(eq(schema.scheduleItems.subjectId, subjectId));
  }

  async getScheduleItemsByStudent(studentId: number): Promise<(ScheduleItem & { subject: Subject })[]> {
    const enrollments = await this.getEnrollmentsByStudent(studentId);
    const subjectIds = enrollments.map(e => e.subjectId);
    
    if (subjectIds.length === 0) {
      return [];
    }
    
    const query = db.select()
      .from(schema.scheduleItems)
      .leftJoin(
        schema.subjects,
        eq(schema.scheduleItems.subjectId, schema.subjects.id)
      )
      .where(
        or(...subjectIds.map(id => eq(schema.scheduleItems.subjectId, id)))
      );
    
    const results = await query;
    
    return results.map(({ schedule_items, subjects }) => ({
      ...schedule_items,
      subject: subjects
    }));
  }

  async getScheduleItemsByTeacher(teacherId: number): Promise<(ScheduleItem & { subject: Subject })[]> {
    const query = db.select()
      .from(schema.scheduleItems)
      .leftJoin(
        schema.subjects,
        eq(schema.scheduleItems.subjectId, schema.subjects.id)
      )
      .where(
        eq(schema.subjects.teacherId, teacherId)
      );
    
    const results = await query;
    
    return results.map(({ schedule_items, subjects }) => ({
      ...schedule_items,
      subject: subjects
    }));
  }

  async createScheduleItem(scheduleItemData: InsertScheduleItem): Promise<ScheduleItem> {
    const [item] = await db.insert(schema.scheduleItems)
      .values(scheduleItemData)
      .returning();
    
    return item;
  }

  async updateScheduleItem(id: number, scheduleItemData: Partial<InsertScheduleItem>): Promise<ScheduleItem | undefined> {
    const [item] = await db.update(schema.scheduleItems)
      .set(scheduleItemData)
      .where(eq(schema.scheduleItems.id, id))
      .returning();
    
    return item;
  }

  async deleteScheduleItem(id: number): Promise<boolean> {
    const result = await db.delete(schema.scheduleItems)
      .where(eq(schema.scheduleItems.id, id));
    
    return result.rowCount > 0;
  }

  // Assignments
  async getAssignments(): Promise<Assignment[]> {
    return db.select().from(schema.assignments);
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const assignments = await db.select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, id))
      .limit(1);
    return assignments[0];
  }

  async getAssignmentsBySubject(subjectId: number): Promise<Assignment[]> {
    return db.select()
      .from(schema.assignments)
      .where(eq(schema.assignments.subjectId, subjectId));
  }

  async getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]> {
    return db.select()
      .from(schema.assignments)
      .where(eq(schema.assignments.createdBy, teacherId));
  }

  async getAssignmentsByStudent(studentId: number): Promise<Assignment[]> {
    const subjects = await this.getSubjectsByStudent(studentId);
    const subjectIds = subjects.map(s => s.id);
    
    if (subjectIds.length === 0) {
      return [];
    }
    
    return db.select()
      .from(schema.assignments)
      .where(
        or(...subjectIds.map(id => eq(schema.assignments.subjectId, id)))
      );
  }

  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(schema.assignments)
      .values(assignmentData)
      .returning();
    
    return assignment;
  }

  async updateAssignment(id: number, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [assignment] = await db.update(schema.assignments)
      .set(assignmentData)
      .where(eq(schema.assignments.id, id))
      .returning();
    
    return assignment;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const result = await db.delete(schema.assignments)
      .where(eq(schema.assignments.id, id));
    
    return result.rowCount > 0;
  }

  // Submissions
  async getSubmissions(): Promise<Submission[]> {
    return db.select().from(schema.submissions);
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const submissions = await db.select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id))
      .limit(1);
    return submissions[0];
  }

  async getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]> {
    return db.select()
      .from(schema.submissions)
      .where(eq(schema.submissions.assignmentId, assignmentId));
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return db.select()
      .from(schema.submissions)
      .where(eq(schema.submissions.studentId, studentId));
  }

  async getSubmissionByAssignmentAndStudent(assignmentId: number, studentId: number): Promise<Submission | undefined> {
    const submissions = await db.select()
      .from(schema.submissions)
      .where(
        and(
          eq(schema.submissions.assignmentId, assignmentId),
          eq(schema.submissions.studentId, studentId)
        )
      )
      .limit(1);
    return submissions[0];
  }

  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(schema.submissions)
      .values(submissionData)
      .returning();
    
    return submission;
  }

  async updateSubmission(id: number, submissionData: Partial<InsertSubmission>): Promise<Submission | undefined> {
    const [submission] = await db.update(schema.submissions)
      .set(submissionData)
      .where(eq(schema.submissions.id, id))
      .returning();
    
    return submission;
  }

  async deleteSubmission(id: number): Promise<boolean> {
    const result = await db.delete(schema.submissions)
      .where(eq(schema.submissions.id, id));
    
    return result.rowCount > 0;
  }

  // Grades
  async getGrades(): Promise<Grade[]> {
    return db.select().from(schema.grades);
  }

  async getGrade(id: number): Promise<Grade | undefined> {
    const grades = await db.select()
      .from(schema.grades)
      .where(eq(schema.grades.id, id))
      .limit(1);
    return grades[0];
  }

  async getGradesByStudent(studentId: number): Promise<Grade[]> {
    return db.select()
      .from(schema.grades)
      .where(eq(schema.grades.studentId, studentId));
  }

  async getGradesBySubject(subjectId: number): Promise<Grade[]> {
    return db.select()
      .from(schema.grades)
      .where(eq(schema.grades.subjectId, subjectId));
  }

  async getGradesByStudentAndSubject(studentId: number, subjectId: number): Promise<Grade[]> {
    return db.select()
      .from(schema.grades)
      .where(
        and(
          eq(schema.grades.studentId, studentId),
          eq(schema.grades.subjectId, subjectId)
        )
      );
  }

  async createGrade(gradeData: InsertGrade): Promise<Grade> {
    const [grade] = await db.insert(schema.grades)
      .values(gradeData)
      .returning();
    
    return grade;
  }

  async updateGrade(id: number, gradeData: Partial<InsertGrade>): Promise<Grade | undefined> {
    const [grade] = await db.update(schema.grades)
      .set(gradeData)
      .where(eq(schema.grades.id, id))
      .returning();
    
    return grade;
  }

  async deleteGrade(id: number): Promise<boolean> {
    const result = await db.delete(schema.grades)
      .where(eq(schema.grades.id, id));
    
    return result.rowCount > 0;
  }

  // Requests
  async getRequests(): Promise<Request[]> {
    return db.select().from(schema.requests);
  }

  async getRequest(id: number): Promise<Request | undefined> {
    const requests = await db.select()
      .from(schema.requests)
      .where(eq(schema.requests.id, id))
      .limit(1);
    return requests[0];
  }

  async getRequestsByStudent(studentId: number): Promise<Request[]> {
    return db.select()
      .from(schema.requests)
      .where(eq(schema.requests.studentId, studentId));
  }

  async getPendingRequests(): Promise<Request[]> {
    return db.select()
      .from(schema.requests)
      .where(eq(schema.requests.status, 'pending'));
  }

  async createRequest(requestData: InsertRequest): Promise<Request> {
    const [request] = await db.insert(schema.requests)
      .values({
        ...requestData,
        status: 'pending'
      })
      .returning();
    
    return request;
  }

  async updateRequestStatus(id: number, status: 'pending' | 'approved' | 'rejected', resolvedBy: number, resolution?: string): Promise<Request | undefined> {
    const [request] = await db.update(schema.requests)
      .set({
        status,
        resolvedBy,
        resolvedAt: new Date().toISOString(),
        resolution
      })
      .where(eq(schema.requests.id, id))
      .returning();
    
    return request;
  }

  async deleteRequest(id: number): Promise<boolean> {
    const result = await db.delete(schema.requests)
      .where(eq(schema.requests.id, id));
    
    return result.rowCount > 0;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return db.select().from(schema.documents);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const documents = await db.select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id))
      .limit(1);
    return documents[0];
  }

  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return db.select()
      .from(schema.documents)
      .where(eq(schema.documents.userId, userId));
  }

  async getDocumentsByType(userId: number, type: string): Promise<Document[]> {
    return db.select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.userId, userId),
          eq(schema.documents.type, type)
        )
      );
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db.insert(schema.documents)
      .values(documentData)
      .returning();
    
    return document;
  }

  async updateDocument(id: number, documentData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db.update(schema.documents)
      .set(documentData)
      .where(eq(schema.documents.id, id))
      .returning();
    
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(schema.documents)
      .where(eq(schema.documents.id, id));
    
    return result.rowCount > 0;
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return db.select().from(schema.messages);
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const messages = await db.select()
      .from(schema.messages)
      .where(eq(schema.messages.id, id))
      .limit(1);
    return messages[0];
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    return db.select()
      .from(schema.messages)
      .where(
        or(
          eq(schema.messages.fromUserId, userId),
          eq(schema.messages.toUserId, userId)
        )
      )
      .orderBy(desc(schema.messages.sentAt));
  }

  async getMessagesBetweenUsers(fromUserId: number, toUserId: number): Promise<Message[]> {
    return db.select()
      .from(schema.messages)
      .where(
        or(
          and(
            eq(schema.messages.fromUserId, fromUserId),
            eq(schema.messages.toUserId, toUserId)
          ),
          and(
            eq(schema.messages.fromUserId, toUserId),
            eq(schema.messages.toUserId, fromUserId)
          )
        )
      )
      .orderBy(asc(schema.messages.sentAt));
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(schema.messages)
      .values({
        ...messageData,
        status: 'sent'
      })
      .returning();
    
    return message;
  }

  async updateMessageStatus(id: number, status: 'delivered' | 'read'): Promise<Message | undefined> {
    const [message] = await db.update(schema.messages)
      .set({ status })
      .where(eq(schema.messages.id, id))
      .returning();
    
    return message;
  }

  async deleteMessage(id: number): Promise<boolean> {
    const result = await db.delete(schema.messages)
      .where(eq(schema.messages.id, id));
    
    return result.rowCount > 0;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return db.select().from(schema.notifications);
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const notifications = await db.select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, id))
      .limit(1);
    return notifications[0];
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return db.select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    return db.select()
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false)
        )
      )
      .orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(schema.notifications)
      .values({
        ...notificationData,
        isRead: false
      })
      .returning();
    
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [notification] = await db.update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id))
      .returning();
    
    return notification;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db.delete(schema.notifications)
      .where(eq(schema.notifications.id, id));
    
    return result.rowCount > 0;
  }

  // Imported Files
  async getImportedFiles(): Promise<ImportedFile[]> {
    return db.select().from(schema.importedFiles)
      .orderBy(desc(schema.importedFiles.uploadedAt));
  }

  async getImportedFile(id: number): Promise<ImportedFile | undefined> {
    const files = await db.select()
      .from(schema.importedFiles)
      .where(eq(schema.importedFiles.id, id))
      .limit(1);
    return files[0];
  }

  async getImportedFilesByUser(userId: number): Promise<ImportedFile[]> {
    return db.select()
      .from(schema.importedFiles)
      .where(eq(schema.importedFiles.uploadedBy, userId))
      .orderBy(desc(schema.importedFiles.uploadedAt));
  }

  async createImportedFile(fileData: InsertImportedFile): Promise<ImportedFile> {
    const [file] = await db.insert(schema.importedFiles)
      .values(fileData)
      .returning();
    
    return file;
  }

  async deleteImportedFile(id: number): Promise<boolean> {
    try {
      console.log(`Deleting imported file with ID: ${id}`);
      
      // First check if the imported file exists
      const file = await this.getImportedFile(id);
      if (!file) {
        console.error(`ImportedFile with ID ${id} not found`);
        return false;
      }
      
      console.log(`Found file: ${file.originalName}, now deleting related schedule items`);
      
      try {
        // First, start a transaction to ensure both operations succeed or fail together
        await db.transaction(async (tx) => {
          // Step 1: Delete all schedule items associated with this imported file
          console.log(`Deleting schedule items with importedFileId = ${id}`);
          const deleteItemsResult = await tx.delete(schema.scheduleItems)
            .where(eq(schema.scheduleItems.importedFileId, id));
          console.log(`Successfully deleted ${deleteItemsResult.rowCount || 0} schedule items`);
          
          // Step 2: Delete the file record
          console.log(`Now deleting the imported file record with ID: ${id}`);
          const result = await tx.delete(schema.importedFiles)
            .where(eq(schema.importedFiles.id, id));
          
          if ((result.rowCount || 0) === 0) {
            // If no rows were affected, roll back the transaction
            console.error(`No imported file with ID ${id} found to delete`);
            throw new Error(`Imported file with ID ${id} not found`);
          }
          
          console.log(`Successfully deleted imported file record with ID: ${id}`);
        });
        
        // If we reach here, the transaction was successful
        return true;
      } catch (txError) {
        console.error('Transaction error when deleting imported file:', txError);
        if (txError instanceof Error) {
          console.error('Transaction error details:', {
            name: txError.name,
            message: txError.message,
            stack: txError.stack
          });
        }
        // Re-throw the error to be caught by the outer try-catch
        throw txError;
      }
    } catch (error) {
      console.error('Error deleting imported file:', error);
      // Print detailed error information for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      return false;
    }
  }

  async getImportedFilesByType(type: 'csv' | 'google-sheets'): Promise<ImportedFile[]> {
    return db.select()
      .from(schema.importedFiles)
      .where(eq(schema.importedFiles.importType, type))
      .orderBy(desc(schema.importedFiles.uploadedAt));
  }

  // Activity Logs
  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    const query = db.select()
      .from(schema.activityLogs)
      .orderBy(desc(schema.activityLogs.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }
  
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(schema.activityLogs)
      .values(logData)
      .returning();
    
    return log;
  }
  
  async getActivityLogsByType(type: string, limit?: number): Promise<ActivityLog[]> {
    const query = db.select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.activityType, type as any))
      .orderBy(desc(schema.activityLogs.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }
  
  async getActivityLogsByUser(userId: number, limit?: number): Promise<ActivityLog[]> {
    const query = db.select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.userId, userId))
      .orderBy(desc(schema.activityLogs.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }
  
  // Tasks
  async getTasks(): Promise<(Task & { client?: User, executor?: User })[]> {
    const tasks = await db.select()
      .from(schema.tasks)
      .leftJoin(schema.users.as('client'), eq(schema.tasks.clientId, schema.users.as('client').id))
      .leftJoin(schema.users.as('executor'), eq(schema.tasks.executorId, schema.users.as('executor').id))
      .orderBy(
        // Order by status priority (new → in_progress → on_hold → completed)
        sql`CASE 
          WHEN ${schema.tasks.status} = 'new' THEN 1
          WHEN ${schema.tasks.status} = 'in_progress' THEN 2
          WHEN ${schema.tasks.status} = 'on_hold' THEN 3
          WHEN ${schema.tasks.status} = 'completed' THEN 4
          ELSE 5
        END`,
        // Then by priority (high → medium → low)
        sql`CASE 
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
        // Finally by creation date (newest first)
        desc(schema.tasks.createdAt)
      );
      
    // Format the result to include client and executor objects
    return tasks.map(task => {
      // Extract base task properties
      const baseTask = {
        id: task.tasks.id,
        title: task.tasks.title,
        description: task.tasks.description,
        status: task.tasks.status,
        priority: task.tasks.priority,
        createdAt: task.tasks.createdAt,
        updatedAt: task.tasks.updatedAt,
        dueDate: task.tasks.dueDate,
        clientId: task.tasks.clientId,
        executorId: task.tasks.executorId,
      };
      
      // Add client and executor info if available
      const client = task.client ? {
        id: task.client.id,
        firstName: task.client.firstName,
        lastName: task.client.lastName,
        email: task.client.email,
        role: task.client.role,
      } : undefined;
      
      const executor = task.executor ? {
        id: task.executor.id,
        firstName: task.executor.firstName,
        lastName: task.executor.lastName,
        email: task.executor.email,
        role: task.executor.role,
      } : undefined;
      
      return {
        ...baseTask,
        client,
        executor
      };
    });
  }
  
  async getTask(id: number): Promise<(Task & { client?: User, executor?: User }) | undefined> {
    const tasks = await db.select()
      .from(schema.tasks)
      .leftJoin(schema.users.as('client'), eq(schema.tasks.clientId, schema.users.as('client').id))
      .leftJoin(schema.users.as('executor'), eq(schema.tasks.executorId, schema.users.as('executor').id))
      .where(eq(schema.tasks.id, id))
      .limit(1);
      
    if (tasks.length === 0) return undefined;
    
    const task = tasks[0];
    
    // Format the result to include client and executor objects
    const baseTask = {
      id: task.tasks.id,
      title: task.tasks.title,
      description: task.tasks.description,
      status: task.tasks.status,
      priority: task.tasks.priority,
      createdAt: task.tasks.createdAt,
      updatedAt: task.tasks.updatedAt,
      dueDate: task.tasks.dueDate,
      clientId: task.tasks.clientId,
      executorId: task.tasks.executorId,
    };
    
    // Add client and executor info if available
    const client = task.client ? {
      id: task.client.id,
      firstName: task.client.firstName,
      lastName: task.client.lastName,
      email: task.client.email,
      role: task.client.role,
    } : undefined;
    
    const executor = task.executor ? {
      id: task.executor.id,
      firstName: task.executor.firstName,
      lastName: task.executor.lastName,
      email: task.executor.email,
      role: task.executor.role,
    } : undefined;
    
    return {
      ...baseTask,
      client,
      executor
    };
  }
  
  async getTasksByClient(clientId: number): Promise<(Task & { client?: User, executor?: User })[]> {
    const tasks = await db.select()
      .from(schema.tasks)
      .leftJoin(schema.users.as('client'), eq(schema.tasks.clientId, schema.users.as('client').id))
      .leftJoin(schema.users.as('executor'), eq(schema.tasks.executorId, schema.users.as('executor').id))
      .where(eq(schema.tasks.clientId, clientId))
      .orderBy(
        // Order by status priority (new → in_progress → on_hold → completed)
        sql`CASE 
          WHEN ${schema.tasks.status} = 'new' THEN 1
          WHEN ${schema.tasks.status} = 'in_progress' THEN 2
          WHEN ${schema.tasks.status} = 'on_hold' THEN 3
          WHEN ${schema.tasks.status} = 'completed' THEN 4
          ELSE 5
        END`,
        // Then by priority (high → medium → low)
        sql`CASE 
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
        // Finally by creation date (newest first)
        desc(schema.tasks.createdAt)
      );
    
    // Format the result to include client and executor objects
    return tasks.map(task => {
      // Extract base task properties
      const baseTask = {
        id: task.tasks.id,
        title: task.tasks.title,
        description: task.tasks.description,
        status: task.tasks.status,
        priority: task.tasks.priority,
        createdAt: task.tasks.createdAt,
        updatedAt: task.tasks.updatedAt,
        dueDate: task.tasks.dueDate,
        clientId: task.tasks.clientId,
        executorId: task.tasks.executorId,
      };
      
      // Add client and executor info if available
      const client = task.client ? {
        id: task.client.id,
        firstName: task.client.firstName,
        lastName: task.client.lastName,
        email: task.client.email,
        role: task.client.role,
      } : undefined;
      
      const executor = task.executor ? {
        id: task.executor.id,
        firstName: task.executor.firstName,
        lastName: task.executor.lastName,
        email: task.executor.email,
        role: task.executor.role,
      } : undefined;
      
      return {
        ...baseTask,
        client,
        executor
      };
    });
  }
  
  async getTasksByExecutor(executorId: number): Promise<(Task & { client?: User, executor?: User })[]> {
    const tasks = await db.select()
      .from(schema.tasks)
      .leftJoin(schema.users.as('client'), eq(schema.tasks.clientId, schema.users.as('client').id))
      .leftJoin(schema.users.as('executor'), eq(schema.tasks.executorId, schema.users.as('executor').id))
      .where(eq(schema.tasks.executorId, executorId))
      .orderBy(
        // Order by status priority (new → in_progress → on_hold → completed)
        sql`CASE 
          WHEN ${schema.tasks.status} = 'new' THEN 1
          WHEN ${schema.tasks.status} = 'in_progress' THEN 2
          WHEN ${schema.tasks.status} = 'on_hold' THEN 3
          WHEN ${schema.tasks.status} = 'completed' THEN 4
          ELSE 5
        END`,
        // Then by priority (high → medium → low)
        sql`CASE 
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
        // Finally by creation date (newest first)
        desc(schema.tasks.createdAt)
      );
    
    // Format the result to include client and executor objects
    return tasks.map(task => {
      // Extract base task properties
      const baseTask = {
        id: task.tasks.id,
        title: task.tasks.title,
        description: task.tasks.description,
        status: task.tasks.status,
        priority: task.tasks.priority,
        createdAt: task.tasks.createdAt,
        updatedAt: task.tasks.updatedAt,
        dueDate: task.tasks.dueDate,
        clientId: task.tasks.clientId,
        executorId: task.tasks.executorId,
      };
      
      // Add client and executor info if available
      const client = task.client ? {
        id: task.client.id,
        firstName: task.client.firstName,
        lastName: task.client.lastName,
        email: task.client.email,
        role: task.client.role,
      } : undefined;
      
      const executor = task.executor ? {
        id: task.executor.id,
        firstName: task.executor.firstName,
        lastName: task.executor.lastName,
        email: task.executor.email,
        role: task.executor.role,
      } : undefined;
      
      return {
        ...baseTask,
        client,
        executor
      };
    });
  }
  
  async getTasksByStatus(status: string): Promise<(Task & { client?: User, executor?: User })[]> {
    const tasks = await db.select()
      .from(schema.tasks)
      .leftJoin(schema.users.as('client'), eq(schema.tasks.clientId, schema.users.as('client').id))
      .leftJoin(schema.users.as('executor'), eq(schema.tasks.executorId, schema.users.as('executor').id))
      .where(eq(schema.tasks.status, status as any))
      .orderBy(
        // For same status tasks, order by priority (high → medium → low)
        sql`CASE 
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`,
        // Then by creation date (newest first)
        desc(schema.tasks.createdAt)
      );
    
    // Format the result to include client and executor objects
    return tasks.map(task => {
      // Extract base task properties
      const baseTask = {
        id: task.tasks.id,
        title: task.tasks.title,
        description: task.tasks.description,
        status: task.tasks.status,
        priority: task.tasks.priority,
        createdAt: task.tasks.createdAt,
        updatedAt: task.tasks.updatedAt,
        dueDate: task.tasks.dueDate,
        clientId: task.tasks.clientId,
        executorId: task.tasks.executorId,
      };
      
      // Add client and executor info if available
      const client = task.client ? {
        id: task.client.id,
        firstName: task.client.firstName,
        lastName: task.client.lastName,
        email: task.client.email,
        role: task.client.role,
      } : undefined;
      
      const executor = task.executor ? {
        id: task.executor.id,
        firstName: task.executor.firstName,
        lastName: task.executor.lastName,
        email: task.executor.email,
        role: task.executor.role,
      } : undefined;
      
      return {
        ...baseTask,
        client,
        executor
      };
    });
  }
  
  async getTasksDueSoon(days: number): Promise<(Task & { client?: User, executor?: User })[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    
    const tasks = await db.select()
      .from(schema.tasks)
      .leftJoin(schema.users.as('client'), eq(schema.tasks.clientId, schema.users.as('client').id))
      .leftJoin(schema.users.as('executor'), eq(schema.tasks.executorId, schema.users.as('executor').id))
      .where(
        and(
          // Only tasks that aren't completed
          or(
            eq(schema.tasks.status, 'new'),
            eq(schema.tasks.status, 'in_progress'),
            eq(schema.tasks.status, 'on_hold')
          ),
          // And their due date is within the specified number of days
          and(
            // dueDate is not null
            schema.tasks.dueDate.notNull(),
            // dueDate <= future
            sql`${schema.tasks.dueDate} <= ${future.toISOString()}`
          )
        )
      )
      .orderBy(
        // First by due date (ascending)
        asc(schema.tasks.dueDate),
        // Then by priority (high → medium → low)
        sql`CASE 
          WHEN ${schema.tasks.priority} = 'high' THEN 1
          WHEN ${schema.tasks.priority} = 'medium' THEN 2
          WHEN ${schema.tasks.priority} = 'low' THEN 3
          ELSE 4
        END`
      );
      
    // Format the result to include client and executor objects
    return tasks.map(task => {
      // Extract base task properties
      const baseTask = {
        id: task.tasks.id,
        title: task.tasks.title,
        description: task.tasks.description,
        status: task.tasks.status,
        priority: task.tasks.priority,
        createdAt: task.tasks.createdAt,
        updatedAt: task.tasks.updatedAt,
        dueDate: task.tasks.dueDate,
        clientId: task.tasks.clientId,
        executorId: task.tasks.executorId,
      };
      
      // Add client and executor info if available
      const client = task.client ? {
        id: task.client.id,
        firstName: task.client.firstName,
        lastName: task.client.lastName,
        email: task.client.email,
        role: task.client.role,
      } : undefined;
      
      const executor = task.executor ? {
        id: task.executor.id,
        firstName: task.executor.firstName,
        lastName: task.executor.lastName,
        email: task.executor.email,
        role: task.executor.role,
      } : undefined;
      
      return {
        ...baseTask,
        client,
        executor
      };
    });
  }
  
  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(schema.tasks)
      .values(taskData)
      .returning();
    
    return task;
  }
  
  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    try {
      // Используем новый объект Date вместо строки ISO для updatedAt
      const [task] = await db.update(schema.tasks)
        .set({
          ...taskData,
          updatedAt: new Date() // Передаем объект Date напрямую
        })
        .where(eq(schema.tasks.id, id))
        .returning();
      
      return task;
    } catch (error) {
      console.error('Error updating task in DB:', error);
      throw error; // Передаем ошибку дальше для обработки
    }
  }
  
  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(schema.tasks)
      .where(eq(schema.tasks.id, id));
    
    return result.rowCount > 0;
  }
}

// Factory function to create a database-backed storage
export async function createDatabaseStorage(): Promise<IStorage> {
  // Test database connection
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.error('Failed to connect to the database. Using in-memory storage instead.');
    throw new Error('Database connection failed');
  }
  
  return new PostgresStorage();
}