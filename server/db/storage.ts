import { db } from './index';
import * as schema from '@shared/schema';
import { eq, and, or, desc, asc, sql, isNotNull } from 'drizzle-orm';
import { aliasedTable } from 'drizzle-orm/alias';
import { IStorage } from '../storage';
import { UsersRepository } from './users/repository';
import { SubjectsRepository } from './subjects/repository';
import { TasksRepository } from './tasks/repository';
import pg from 'pg';
import { getOrSet } from '../utils/cache';

import * as notificationQueries from './notifications';

const { Pool } = pg;
import {
  User, InsertUser, Subject, InsertSubject, Enrollment, InsertEnrollment,
  ScheduleItem, InsertScheduleItem, Assignment, InsertAssignment,
  Submission, InsertSubmission, Grade, InsertGrade, Request, InsertRequest,
  Document, InsertDocument, Message, InsertMessage, Notification, InsertNotification,
  LoginCredentials, ImportedFile, InsertImportedFile, ActivityLog, InsertActivityLog,
  Task, InsertTask, UserSummary
} from '@shared/schema';
import { testConnection } from './index';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { log } from '../vite';
import { logger } from '../utils/logger';

type EducationLevel = (typeof schema.educationLevelEnum.enumValues)[number];


/**
 * Реализация IStorage, использующая базу данных Supabase
 */
export class SupabaseStorage {
  private usersRepo = new UsersRepository();
  private subjectsRepo = new SubjectsRepository();
  private tasksRepo = new TasksRepository();

  constructor() {
    log("Using Supabase storage");
  }

  // User management
  async getUsers(): Promise<User[]> {
    return this.usersRepo.getUsers();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.usersRepo.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersRepo.getUserByEmail(email);
  }

  
  async getUsersByRole(role: string): Promise<User[]> {
    return this.usersRepo.getUsersByRole(role);
  }

  async createUser(userData: InsertUser): Promise<User> {
    return this.usersRepo.createUser(userData);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    return this.usersRepo.updateUser(id, userData);
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.usersRepo.deleteUser(id);
  }

  async authenticate(credentials: LoginCredentials): Promise<User | undefined> {
    return this.usersRepo.authenticate(credentials);
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
    return this.subjectsRepo.getSubjects();
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjectsRepo.getSubject(id);
  }

  async getSubjectsByTeacher(teacherId: string): Promise<Subject[]> {
    return this.subjectsRepo.getSubjectsByTeacher(teacherId);
  }

  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    return this.subjectsRepo.createSubject(subjectData);
  }

  async updateSubject(id: number, subjectData: Partial<InsertSubject>): Promise<Subject | undefined> {
    return this.subjectsRepo.updateSubject(id, subjectData);
  }

  async deleteSubject(id: number): Promise<boolean> {
    return this.subjectsRepo.deleteSubject(id);
  }

  // Enrollments
  async getEnrollments(): Promise<Enrollment[]> {
    return db.select().from(schema.enrollments);
  }

  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
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
    const results = await db.select({ users: schema.users })
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

    return results.map((r) => r.users);
  }

  async getSubjectsByStudent(studentId: string): Promise<Subject[]> {
    const results = await db.select({ subjects: schema.subjects })
      .from(schema.subjects)
      .innerJoin(
        schema.enrollments,
        and(
          eq(schema.subjects.id, schema.enrollments.subjectId),
          eq(schema.enrollments.studentId, studentId)
        )
      )
      .orderBy(schema.subjects.name);

    return results.map((r) => r.subjects);
  }

  async createEnrollment(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db.insert(schema.enrollments)
      .values({
        ...enrollmentData,
        studentId: enrollmentData.studentId,
      })
      .returning();
    
    return enrollment;
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    const result = await db.delete(schema.enrollments)
      .where(eq(schema.enrollments.id, id));

    return (result.rowCount ?? 0) > 0;
  }

  // Schedule
  async getScheduleItems(): Promise<ScheduleItem[]> {
    return getOrSet('scheduleItems', async () => {
      return db.select().from(schema.scheduleItems);
    });
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

  async getScheduleItemsByStudent(studentId: string): Promise<(ScheduleItem & { subject: Subject })[]> {
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
      subject: subjects!
    }));
  }

  async getScheduleItemsByTeacher(teacherId: string): Promise<(ScheduleItem & { subject: Subject })[]> {
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
      subject: subjects!
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

    return (result.rowCount ?? 0) > 0;
  }

  // Assignments
  async getAssignments(): Promise<Assignment[]> {
    return db.select().from(schema.assignments);
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const assignments = await db.select()
      .from(schema.assignments)
      .where(eq(schema.assignments.id, String(id)))
      .limit(1);
    return assignments[0];
  }

  async getAssignmentsBySubject(subjectId: number): Promise<Assignment[]> {
    return db.select()
      .from(schema.assignments)
      .where(eq(schema.assignments.subjectId, String(subjectId)));
  }

  async getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
    const results = await db.select()
      .from(schema.assignments)
      .where(eq(schema.assignments.createdBy, teacherId));

    return results;
  }

  async getAssignmentsByStudent(studentId: string): Promise<Assignment[]> {
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
      .values({
        ...assignmentData,
        createdBy: assignmentData.createdBy,
      })
      .returning();
    
    return assignment;
  }

  async updateAssignment(id: number, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [assignment] = await db.update(schema.assignments)
      .set(assignmentData)
      .where(eq(schema.assignments.id, String(id)))
      .returning();
    
    return assignment;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const result = await db.delete(schema.assignments)
      .where(eq(schema.assignments.id, id));

    return (result.rowCount ?? 0) > 0;
  }

  // Submissions
  async getSubmissions(): Promise<Submission[]> {
    return db.select().from(schema.submissions);
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const submissions = await db.select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, String(id)))
      .limit(1);
    return submissions[0];
  }

  async getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]> {
    return db.select()
      .from(schema.submissions)
      .where(eq(schema.submissions.assignmentId, String(assignmentId)));
  }

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    return db.select()
      .from(schema.submissions)
      .where(eq(schema.submissions.studentId, studentId));
  }

  async getSubmissionByAssignmentAndStudent(assignmentId: number, studentId: string): Promise<Submission | undefined> {
    const submissions = await db.select()
      .from(schema.submissions)
      .where(
        and(
          eq(schema.submissions.assignmentId, String(assignmentId)),
          eq(schema.submissions.studentId, studentId)
        )
      )
      .limit(1);
    return submissions[0];
  }

  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(schema.submissions)
      .values({
        ...submissionData,
        studentId: submissionData.studentId,
      })
      .returning();
    
    return submission;
  }

  async updateSubmission(id: number, submissionData: Partial<InsertSubmission>): Promise<Submission | undefined> {
    const [submission] = await db.update(schema.submissions)
      .set(submissionData)
      .where(eq(schema.submissions.id, String(id)))
      .returning();
    
    return submission;
  }

  async deleteSubmission(id: number): Promise<boolean> {
    const result = await db.delete(schema.submissions)
      .where(eq(schema.submissions.id, String(id)));

    return (result.rowCount ?? 0) > 0;
  }

  // Grades
  async getGrades(): Promise<Grade[]> {
    return db.select().from(schema.grades);
  }

  async getGrade(id: number): Promise<Grade | undefined> {
    const grades = await db.select()
      .from(schema.grades)
      .where(eq(schema.grades.id, String(id)))
      .limit(1);
    return grades[0];
  }

  async getGradesByStudent(studentId: string): Promise<Grade[]> {
    const results = await db.select()
      .from(schema.grades)
      .where(eq(schema.grades.studentId, studentId));

    return results;
  }

  async getGradesBySubject(subjectId: number): Promise<Grade[]> {
    return db.select()
      .from(schema.grades)
      .where(eq(schema.grades.subjectId, String(subjectId)));
  }

  async getGradesByStudentAndSubject(studentId: string, subjectId: number): Promise<Grade[]> {
    const results = await db.select()
      .from(schema.grades)
      .where(
        and(
          eq(schema.grades.studentId, studentId),
          eq(schema.grades.subjectId, String(subjectId))
        )
      );

    return results;
  }

  async createGrade(gradeData: InsertGrade): Promise<Grade> {
    const [grade] = await db.insert(schema.grades)
      .values({
        ...gradeData,
        studentId: gradeData.studentId,
      })
      .returning();
    
    return grade;
  }

  async updateGrade(id: number, gradeData: Partial<InsertGrade>): Promise<Grade | undefined> {
    const [grade] = await db.update(schema.grades)
      .set(gradeData)
      .where(eq(schema.grades.id, String(id)))
      .returning();
    
    return grade;
  }

  async deleteGrade(id: number): Promise<boolean> {
    const result = await db.delete(schema.grades)
      .where(eq(schema.grades.id, String(id)));

    return (result.rowCount ?? 0) > 0;
  }

  // Requests
  async getRequests(): Promise<Request[]> {
    return db.select().from(schema.requests);
  }

  async getRequest(id: number): Promise<Request | undefined> {
    const requests = await db.select()
      .from(schema.requests)
      .where(eq(schema.requests.id, String(id)))
      .limit(1);
    return requests[0];
  }

  async getRequestsByStudent(studentId: string): Promise<Request[]> {
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
        studentId: requestData.studentId,
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
          resolvedAt: new Date(),
          resolution
        })
      .where(eq(schema.requests.id, String(id)))
      .returning();
    
    return request;
  }

  async deleteRequest(id: number): Promise<boolean> {
    const result = await db.delete(schema.requests)
      .where(eq(schema.requests.id, String(id)));

    return (result.rowCount ?? 0) > 0;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return db.select().from(schema.documents);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const documents = await db.select()
      .from(schema.documents)
      .where(eq(schema.documents.id, String(id)))
      .limit(1);
    return documents[0];
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return db.select()
      .from(schema.documents)
      .where(eq(schema.documents.userId, userId));
  }

  async getDocumentsByType(userId: string, type: string): Promise<Document[]> {
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
      .values({
        ...documentData,
        userId: documentData.userId,
        createdBy: documentData.createdBy ?? null,
      })
      .returning();
    
    return document;
  }

  async updateDocument(id: number, documentData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db.update(schema.documents)
      .set(documentData)
      .where(eq(schema.documents.id, String(id)))
      .returning();
    
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(schema.documents)
      .where(eq(schema.documents.id, String(id)));

    return (result.rowCount ?? 0) > 0;
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

  async getMessagesByUser(userId: string): Promise<Message[]> {
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

  async getMessagesBetweenUsers(fromUserId: string, toUserId: string): Promise<Message[]> {
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
        fromUserId: messageData.fromUserId,
        toUserId: messageData.toUserId,
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

    return (result.rowCount ?? 0) > 0;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return notificationQueries.getNotifications();
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    return notificationQueries.getNotification(id);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return notificationQueries.getNotificationsByUser(userId);
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return notificationQueries.getUnreadNotificationsByUser(userId);
  }


  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    return notificationQueries.createNotification(notificationData);
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    return notificationQueries.markNotificationAsRead(id);
  }

  async deleteNotification(id: number): Promise<boolean> {
    return notificationQueries.deleteNotification(id);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    return notificationQueries.markAllNotificationsAsRead(userId);
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

  async getImportedFilesByUser(userId: string): Promise<ImportedFile[]> {
    return db.select()
      .from(schema.importedFiles)
      .where(eq(schema.importedFiles.uploadedBy, userId))
      .orderBy(desc(schema.importedFiles.uploadedAt));
  }

  async createImportedFile(fileData: InsertImportedFile): Promise<ImportedFile> {
    const [file] = await db.insert(schema.importedFiles)
      .values({
        ...fileData,
        uploadedBy: fileData.uploadedBy,
      })
      .returning();
    
    return file;
  }

  async deleteImportedFile(id: number): Promise<boolean> {
    try {
      logger.info(`Deleting imported file with ID: ${id}`);
      
      // First check if the imported file exists
      const file = await this.getImportedFile(id);
      if (!file) {
        console.error(`ImportedFile with ID ${id} not found`);
        return false;
      }
      
      logger.info(`Found file: ${file.originalName}, now deleting related schedule items`);
      
      try {
        // First, start a transaction to ensure both operations succeed or fail together
        await db.transaction(async (tx) => {
          // Step 1: Delete all schedule items associated with this imported file
          logger.info(`Deleting schedule items with importedFileId = ${id}`);
          const deleteItemsResult = await tx.delete(schema.scheduleItems)
            .where(eq(schema.scheduleItems.importedFileId, id));
          logger.info(`Successfully deleted ${deleteItemsResult.rowCount || 0} schedule items`);
          
          // Step 2: Delete the file record
          logger.info(`Now deleting the imported file record with ID: ${id}`);
          const result = await tx.delete(schema.importedFiles)
            .where(eq(schema.importedFiles.id, id));
          
          if ((result.rowCount || 0) === 0) {
            // If no rows were affected, roll back the transaction
            console.error(`No imported file with ID ${id} found to delete`);
            throw new Error(`Imported file with ID ${id} not found`);
          }
          
          logger.info(`Successfully deleted imported file record with ID: ${id}`);
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
      .values({
        ...logData,
        userId: logData.userId,
      })
      .returning();
    
    return log;
  }
  
  async getActivityLogsByType(type: string, limit?: number): Promise<ActivityLog[]> {
      const query = db.select()
        .from(schema.activityLogs)
        .where(eq(schema.activityLogs.type, type as any))
      .orderBy(desc(schema.activityLogs.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }
  
  async getActivityLogsByUser(userId: string, limit?: number): Promise<ActivityLog[]> {
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
  async getTasks(): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    return this.tasksRepo.getTasks();
  }

  async getTask(id: number): Promise<(Task & { client?: UserSummary; executor?: UserSummary }) | undefined> {
    return this.tasksRepo.getTask(id);
  }

  async getTasksByClient(clientId: string): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    return this.tasksRepo.getTasksByClient(clientId);
  }

  async getTasksByExecutor(executorId: string): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    return this.tasksRepo.getTasksByExecutor(executorId);
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return this.tasksRepo.getTasksByStatus(status);
  }

  async getTasksDueSoon(days: number): Promise<(Task & { client?: UserSummary; executor?: UserSummary })[]> {
    return this.tasksRepo.getTasksDueSoon(days);
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    return this.tasksRepo.createTask(taskData);
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    return this.tasksRepo.updateTask(id, taskData);
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasksRepo.deleteTask(id);
  }

  // Методы для работы с учебными планами
  async getCurriculumPlans(): Promise<schema.CurriculumPlan[]> {
    return getOrSet('curriculumPlans', async () => {
      const plans = await db.select().from(schema.curriculumPlans)
        .orderBy(desc(schema.curriculumPlans.createdAt));
      return plans;
    });
  }

  async getCurriculumPlan(id: number): Promise<schema.CurriculumPlan | undefined> {
    logger.info(`SupabaseStorage: Getting curriculum plan with ID: ${id}`);
    const plans = await db.select().from(schema.curriculumPlans)
      .where(eq(schema.curriculumPlans.id, id));
    
    return plans.length > 0 ? plans[0] : undefined;
  }

  async getCurriculumPlansByEducationLevel(level: EducationLevel): Promise<schema.CurriculumPlan[]> {
    const plans = await db.select().from(schema.curriculumPlans)
      .where(eq(schema.curriculumPlans.educationLevel, level))
      .orderBy(desc(schema.curriculumPlans.createdAt));
    
    return plans;
  }

  async createCurriculumPlan(planData: schema.InsertCurriculumPlan): Promise<schema.CurriculumPlan> {
    const now = new Date();
    const plan = {
      ...planData,
      createdAt: now,
      updatedAt: now,
      createdBy: planData.createdBy ?? null,
    };

    const result = await db.insert(schema.curriculumPlans)
      .values(plan)
      .returning();
    
    return result[0];
  }

  async updateCurriculumPlan(id: number, planData: Partial<schema.InsertCurriculumPlan>): Promise<schema.CurriculumPlan | undefined> {
    const now = new Date();
    const updateData = {
      ...planData,
      updatedAt: now
    };
    
    const result = await db.update(schema.curriculumPlans)
      .set(updateData)
      .where(eq(schema.curriculumPlans.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteCurriculumPlan(id: number): Promise<boolean> {
    const result = await db.delete(schema.curriculumPlans)
      .where(eq(schema.curriculumPlans.id, id));

    return (result.rowCount ?? 0) > 0;
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
  
  return new SupabaseStorage() as unknown as IStorage;
}