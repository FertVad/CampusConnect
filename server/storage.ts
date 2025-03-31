import { 
  User, InsertUser, Subject, InsertSubject, Enrollment, InsertEnrollment,
  ScheduleItem, InsertScheduleItem, Assignment, InsertAssignment,
  Submission, InsertSubmission, Grade, InsertGrade, Request, InsertRequest,
  Document, InsertDocument, Message, InsertMessage, Notification, InsertNotification,
  LoginCredentials
} from "@shared/schema";
import session from "express-session";
import * as expressSession from 'express-session';
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  sessionStore: expressSession.Store;
  // User management
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  authenticate(credentials: LoginCredentials): Promise<User | undefined>;
  
  // Subjects
  getSubjects(): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjectsByTeacher(teacherId: number): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, subjectData: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<boolean>;
  
  // Enrollments
  getEnrollments(): Promise<Enrollment[]>;
  getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]>;
  getEnrollmentsBySubject(subjectId: number): Promise<Enrollment[]>;
  getStudentsBySubject(subjectId: number): Promise<User[]>;
  getSubjectsByStudent(studentId: number): Promise<Subject[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  deleteEnrollment(id: number): Promise<boolean>;
  
  // Schedule
  getScheduleItems(): Promise<ScheduleItem[]>;
  getScheduleItem(id: number): Promise<ScheduleItem | undefined>;
  getScheduleItemsBySubject(subjectId: number): Promise<ScheduleItem[]>;
  getScheduleItemsByStudent(studentId: number): Promise<(ScheduleItem & { subject: Subject })[]>;
  getScheduleItemsByTeacher(teacherId: number): Promise<(ScheduleItem & { subject: Subject })[]>;
  createScheduleItem(scheduleItem: InsertScheduleItem): Promise<ScheduleItem>;
  updateScheduleItem(id: number, scheduleItemData: Partial<InsertScheduleItem>): Promise<ScheduleItem | undefined>;
  deleteScheduleItem(id: number): Promise<boolean>;
  
  // Assignments
  getAssignments(): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAssignmentsBySubject(subjectId: number): Promise<Assignment[]>;
  getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]>;
  getAssignmentsByStudent(studentId: number): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<boolean>;
  
  // Submissions
  getSubmissions(): Promise<Submission[]>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: number): Promise<Submission[]>;
  getSubmissionByAssignmentAndStudent(assignmentId: number, studentId: number): Promise<Submission | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: number, submissionData: Partial<InsertSubmission>): Promise<Submission | undefined>;
  deleteSubmission(id: number): Promise<boolean>;
  
  // Grades
  getGrades(): Promise<Grade[]>;
  getGrade(id: number): Promise<Grade | undefined>;
  getGradesByStudent(studentId: number): Promise<Grade[]>;
  getGradesBySubject(subjectId: number): Promise<Grade[]>;
  getGradesByStudentAndSubject(studentId: number, subjectId: number): Promise<Grade[]>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGrade(id: number, gradeData: Partial<InsertGrade>): Promise<Grade | undefined>;
  deleteGrade(id: number): Promise<boolean>;
  
  // Requests
  getRequests(): Promise<Request[]>;
  getRequest(id: number): Promise<Request | undefined>;
  getRequestsByStudent(studentId: number): Promise<Request[]>;
  getPendingRequests(): Promise<Request[]>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequestStatus(id: number, status: 'pending' | 'approved' | 'rejected', resolvedBy: number, resolution?: string): Promise<Request | undefined>;
  deleteRequest(id: number): Promise<boolean>;
  
  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByUser(userId: number): Promise<Document[]>;
  getDocumentsByType(userId: number, type: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, documentData: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Messages
  getMessages(): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByUser(userId: number): Promise<Message[]>;
  getMessagesBetweenUsers(fromUserId: number, toUserId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageStatus(id: number, status: 'delivered' | 'read'): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
  
  // Notifications
  getNotifications(): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private subjects: Map<number, Subject>;
  private enrollments: Map<number, Enrollment>;
  private scheduleItems: Map<number, ScheduleItem>;
  private assignments: Map<number, Assignment>;
  private submissions: Map<number, Submission>;
  private grades: Map<number, Grade>;
  private requests: Map<number, Request>;
  private documents: Map<number, Document>;
  private messages: Map<number, Message>;
  private notifications: Map<number, Notification>;
  
  private userIdCounter: number;
  private subjectIdCounter: number;
  private enrollmentIdCounter: number;
  private scheduleItemIdCounter: number;
  private assignmentIdCounter: number;
  private submissionIdCounter: number;
  private gradeIdCounter: number;
  private requestIdCounter: number;
  private documentIdCounter: number;
  private messageIdCounter: number;
  private notificationIdCounter: number;
  
  sessionStore: expressSession.Store;
  
  constructor() {
    this.users = new Map();
    this.subjects = new Map();
    this.enrollments = new Map();
    this.scheduleItems = new Map();
    this.assignments = new Map();
    this.submissions = new Map();
    this.grades = new Map();
    this.requests = new Map();
    this.documents = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    
    this.userIdCounter = 1;
    this.subjectIdCounter = 1;
    this.enrollmentIdCounter = 1;
    this.scheduleItemIdCounter = 1;
    this.assignmentIdCounter = 1;
    this.submissionIdCounter = 1;
    this.gradeIdCounter = 1;
    this.requestIdCounter = 1;
    this.documentIdCounter = 1;
    this.messageIdCounter = 1;
    this.notificationIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Add some seed data
    this.seedData();
  }
  
  // User Management
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...userData, id, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async authenticate(credentials: LoginCredentials): Promise<User | undefined> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) return undefined;
    
    // Note: The actual password verification is handled in auth.ts with comparePasswords
    // This method should just do the lookup by email, as the password check is done separately
    return user;
  }
  
  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }
  
  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }
  
  async getSubjectsByTeacher(teacherId: number): Promise<Subject[]> {
    return Array.from(this.subjects.values()).filter(subject => subject.teacherId === teacherId);
  }
  
  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const id = this.subjectIdCounter++;
    const subject: Subject = { ...subjectData, id };
    this.subjects.set(id, subject);
    return subject;
  }
  
  async updateSubject(id: number, subjectData: Partial<InsertSubject>): Promise<Subject | undefined> {
    const subject = this.subjects.get(id);
    if (!subject) return undefined;
    
    const updatedSubject = { ...subject, ...subjectData };
    this.subjects.set(id, updatedSubject);
    return updatedSubject;
  }
  
  async deleteSubject(id: number): Promise<boolean> {
    return this.subjects.delete(id);
  }
  
  // Enrollments
  async getEnrollments(): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values());
  }
  
  async getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(enrollment => enrollment.studentId === studentId);
  }
  
  async getEnrollmentsBySubject(subjectId: number): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(enrollment => enrollment.subjectId === subjectId);
  }
  
  async getStudentsBySubject(subjectId: number): Promise<User[]> {
    const enrollments = await this.getEnrollmentsBySubject(subjectId);
    const studentIds = enrollments.map(enrollment => enrollment.studentId);
    
    return Array.from(this.users.values())
      .filter(user => user.role === 'student' && studentIds.includes(user.id));
  }
  
  async getSubjectsByStudent(studentId: number): Promise<Subject[]> {
    const enrollments = await this.getEnrollmentsByStudent(studentId);
    const subjectIds = enrollments.map(enrollment => enrollment.subjectId);
    
    return Array.from(this.subjects.values())
      .filter(subject => subjectIds.includes(subject.id));
  }
  
  async createEnrollment(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const id = this.enrollmentIdCounter++;
    const enrollment: Enrollment = { ...enrollmentData, id };
    this.enrollments.set(id, enrollment);
    return enrollment;
  }
  
  async deleteEnrollment(id: number): Promise<boolean> {
    return this.enrollments.delete(id);
  }
  
  // Schedule
  async getScheduleItems(): Promise<ScheduleItem[]> {
    return Array.from(this.scheduleItems.values());
  }
  
  async getScheduleItem(id: number): Promise<ScheduleItem | undefined> {
    return this.scheduleItems.get(id);
  }
  
  async getScheduleItemsBySubject(subjectId: number): Promise<ScheduleItem[]> {
    return Array.from(this.scheduleItems.values())
      .filter(item => item.subjectId === subjectId);
  }
  
  async getScheduleItemsByStudent(studentId: number): Promise<(ScheduleItem & { subject: Subject })[]> {
    const subjects = await this.getSubjectsByStudent(studentId);
    const subjectIds = subjects.map(subject => subject.id);
    
    const scheduleItems = Array.from(this.scheduleItems.values())
      .filter(item => subjectIds.includes(item.subjectId));
    
    return scheduleItems.map(item => {
      const subject = this.subjects.get(item.subjectId);
      return { ...item, subject: subject! };
    });
  }
  
  async getScheduleItemsByTeacher(teacherId: number): Promise<(ScheduleItem & { subject: Subject })[]> {
    const subjects = await this.getSubjectsByTeacher(teacherId);
    const subjectIds = subjects.map(subject => subject.id);
    
    const scheduleItems = Array.from(this.scheduleItems.values())
      .filter(item => subjectIds.includes(item.subjectId));
    
    return scheduleItems.map(item => {
      const subject = this.subjects.get(item.subjectId);
      return { ...item, subject: subject! };
    });
  }
  
  async createScheduleItem(scheduleItemData: InsertScheduleItem): Promise<ScheduleItem> {
    const id = this.scheduleItemIdCounter++;
    const scheduleItem: ScheduleItem = { ...scheduleItemData, id };
    this.scheduleItems.set(id, scheduleItem);
    return scheduleItem;
  }
  
  async updateScheduleItem(id: number, scheduleItemData: Partial<InsertScheduleItem>): Promise<ScheduleItem | undefined> {
    const scheduleItem = this.scheduleItems.get(id);
    if (!scheduleItem) return undefined;
    
    const updatedScheduleItem = { ...scheduleItem, ...scheduleItemData };
    this.scheduleItems.set(id, updatedScheduleItem);
    return updatedScheduleItem;
  }
  
  async deleteScheduleItem(id: number): Promise<boolean> {
    return this.scheduleItems.delete(id);
  }
  
  // Assignments
  async getAssignments(): Promise<Assignment[]> {
    return Array.from(this.assignments.values());
  }
  
  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }
  
  async getAssignmentsBySubject(subjectId: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values())
      .filter(assignment => assignment.subjectId === subjectId);
  }
  
  async getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]> {
    const subjects = await this.getSubjectsByTeacher(teacherId);
    const subjectIds = subjects.map(subject => subject.id);
    
    return Array.from(this.assignments.values())
      .filter(assignment => subjectIds.includes(assignment.subjectId));
  }
  
  async getAssignmentsByStudent(studentId: number): Promise<Assignment[]> {
    const subjects = await this.getSubjectsByStudent(studentId);
    const subjectIds = subjects.map(subject => subject.id);
    
    return Array.from(this.assignments.values())
      .filter(assignment => subjectIds.includes(assignment.subjectId));
  }
  
  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const id = this.assignmentIdCounter++;
    const createdAt = new Date();
    const assignment: Assignment = { ...assignmentData, id, createdAt };
    this.assignments.set(id, assignment);
    return assignment;
  }
  
  async updateAssignment(id: number, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const assignment = this.assignments.get(id);
    if (!assignment) return undefined;
    
    const updatedAssignment = { ...assignment, ...assignmentData };
    this.assignments.set(id, updatedAssignment);
    return updatedAssignment;
  }
  
  async deleteAssignment(id: number): Promise<boolean> {
    return this.assignments.delete(id);
  }
  
  // Submissions
  async getSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values());
  }
  
  async getSubmission(id: number): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }
  
  async getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values())
      .filter(submission => submission.assignmentId === assignmentId);
  }
  
  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values())
      .filter(submission => submission.studentId === studentId);
  }
  
  async getSubmissionByAssignmentAndStudent(assignmentId: number, studentId: number): Promise<Submission | undefined> {
    return Array.from(this.submissions.values()).find(
      submission => submission.assignmentId === assignmentId && submission.studentId === studentId
    );
  }
  
  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const id = this.submissionIdCounter++;
    const submittedAt = new Date();
    const submission: Submission = { 
      ...submissionData, 
      id, 
      submittedAt,
      status: submissionData.status || 'not_started'
    };
    this.submissions.set(id, submission);
    return submission;
  }
  
  async updateSubmission(id: number, submissionData: Partial<InsertSubmission>): Promise<Submission | undefined> {
    const submission = this.submissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = { ...submission, ...submissionData };
    this.submissions.set(id, updatedSubmission);
    return updatedSubmission;
  }
  
  async deleteSubmission(id: number): Promise<boolean> {
    return this.submissions.delete(id);
  }
  
  // Grades
  async getGrades(): Promise<Grade[]> {
    return Array.from(this.grades.values());
  }
  
  async getGrade(id: number): Promise<Grade | undefined> {
    return this.grades.get(id);
  }
  
  async getGradesByStudent(studentId: number): Promise<Grade[]> {
    return Array.from(this.grades.values())
      .filter(grade => grade.studentId === studentId);
  }
  
  async getGradesBySubject(subjectId: number): Promise<Grade[]> {
    return Array.from(this.grades.values())
      .filter(grade => grade.subjectId === subjectId);
  }
  
  async getGradesByStudentAndSubject(studentId: number, subjectId: number): Promise<Grade[]> {
    return Array.from(this.grades.values())
      .filter(grade => grade.studentId === studentId && grade.subjectId === subjectId);
  }
  
  async createGrade(gradeData: InsertGrade): Promise<Grade> {
    const id = this.gradeIdCounter++;
    const now = new Date();
    const grade: Grade = { 
      ...gradeData, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.grades.set(id, grade);
    return grade;
  }
  
  async updateGrade(id: number, gradeData: Partial<InsertGrade>): Promise<Grade | undefined> {
    const grade = this.grades.get(id);
    if (!grade) return undefined;
    
    const updatedGrade = { 
      ...grade, 
      ...gradeData,
      updatedAt: new Date()
    };
    
    this.grades.set(id, updatedGrade);
    return updatedGrade;
  }
  
  async deleteGrade(id: number): Promise<boolean> {
    return this.grades.delete(id);
  }
  
  // Requests
  async getRequests(): Promise<Request[]> {
    return Array.from(this.requests.values());
  }
  
  async getRequest(id: number): Promise<Request | undefined> {
    return this.requests.get(id);
  }
  
  async getRequestsByStudent(studentId: number): Promise<Request[]> {
    return Array.from(this.requests.values())
      .filter(request => request.studentId === studentId);
  }
  
  async getPendingRequests(): Promise<Request[]> {
    return Array.from(this.requests.values())
      .filter(request => request.status === 'pending');
  }
  
  async createRequest(requestData: InsertRequest): Promise<Request> {
    const id = this.requestIdCounter++;
    const createdAt = new Date();
    
    const request: Request = { 
      ...requestData, 
      id,
      status: 'pending',
      createdAt,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null
    };
    
    this.requests.set(id, request);
    return request;
  }
  
  async updateRequestStatus(id: number, status: 'pending' | 'approved' | 'rejected', resolvedBy: number, resolution?: string): Promise<Request | undefined> {
    const request = this.requests.get(id);
    if (!request) return undefined;
    
    const updatedRequest: Request = { 
      ...request, 
      status,
      resolvedBy,
      resolvedAt: status !== 'pending' ? new Date() : null,
      resolution: resolution || null
    };
    
    this.requests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  async deleteRequest(id: number): Promise<boolean> {
    return this.requests.delete(id);
  }
  
  // Documents
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(document => document.userId === userId);
  }
  
  async getDocumentsByType(userId: number, type: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(document => document.userId === userId && document.type === type);
  }
  
  async createDocument(documentData: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const createdAt = new Date();
    
    const document: Document = { 
      ...documentData, 
      id,
      createdAt
    };
    
    this.documents.set(id, document);
    return document;
  }
  
  async updateDocument(id: number, documentData: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...documentData };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
  
  // Messages
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }
  
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getMessagesByUser(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.fromUserId === userId || message.toUserId === userId);
  }
  
  async getMessagesBetweenUsers(fromUserId: number, toUserId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        (message.fromUserId === fromUserId && message.toUserId === toUserId) ||
        (message.fromUserId === toUserId && message.toUserId === fromUserId)
      )
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }
  
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const sentAt = new Date();
    
    const message: Message = { 
      ...messageData, 
      id,
      sentAt,
      status: 'sent'
    };
    
    this.messages.set(id, message);
    return message;
  }
  
  async updateMessageStatus(id: number, status: 'delivered' | 'read'): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, status };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }
  
  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values());
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }
  
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const createdAt = new Date();
    
    const notification: Notification = { 
      ...notificationData, 
      id,
      createdAt,
      isRead: false
    };
    
    this.notifications.set(id, notification);
    return notification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }
  
  // Helper method to seed initial data
  private seedData() {
    // Create users
    const adminUser = this.createUser({
      firstName: "Admin",
      lastName: "User",
      password: "admin123",
      email: "admin@eduportal.com",
      role: "admin"
    });
    
    const teacher1 = this.createUser({
      firstName: "David",
      lastName: "Miller",
      password: "teacher123",
      email: "david@eduportal.com",
      role: "teacher"
    });
    
    const teacher2 = this.createUser({
      firstName: "Sarah",
      lastName: "Johnson",
      password: "teacher123",
      email: "sarah@eduportal.com",
      role: "teacher"
    });
    
    const teacher3 = this.createUser({
      firstName: "Robert",
      lastName: "Chang",
      password: "teacher123",
      email: "robert@eduportal.com",
      role: "teacher"
    });
    
    const student1 = this.createUser({
      firstName: "Alex",
      lastName: "Johnson",
      password: "student123",
      email: "alex@eduportal.com",
      role: "student"
    });
    
    const student2 = this.createUser({
      firstName: "Emma",
      lastName: "Wilson",
      password: "student123",
      email: "emma@eduportal.com",
      role: "student"
    });
    
    // Create subjects
    const math = this.createSubject({
      name: "Calculus II",
      description: "Advanced calculus concepts including integration techniques and applications.",
      teacherId: 2, // David Miller
      roomNumber: "302"
    });
    
    const chemistry = this.createSubject({
      name: "Chemistry",
      description: "Introduction to chemical principles and laboratory techniques.",
      teacherId: 3, // Sarah Johnson
      roomNumber: "Lab 201"
    });
    
    const physics = this.createSubject({
      name: "Physics 101",
      description: "Fundamentals of mechanics, energy, and wave phenomena.",
      teacherId: 4, // Robert Chang
      roomNumber: "105"
    });
    
    const literature = this.createSubject({
      name: "English Literature",
      description: "Critical analysis of classic and contemporary literature.",
      teacherId: 2, // David Miller
      roomNumber: "201"
    });
    
    const history = this.createSubject({
      name: "World History",
      description: "Survey of major historical developments across civilizations.",
      teacherId: 3, // Sarah Johnson
      roomNumber: "103"
    });
    
    // Create enrollments
    this.createEnrollment({ studentId: 5, subjectId: 1 }); // Alex in Calculus
    this.createEnrollment({ studentId: 5, subjectId: 2 }); // Alex in Chemistry
    this.createEnrollment({ studentId: 5, subjectId: 3 }); // Alex in Physics
    this.createEnrollment({ studentId: 5, subjectId: 4 }); // Alex in Literature
    this.createEnrollment({ studentId: 5, subjectId: 5 }); // Alex in History
    
    this.createEnrollment({ studentId: 6, subjectId: 1 }); // Emma in Calculus
    this.createEnrollment({ studentId: 6, subjectId: 2 }); // Emma in Chemistry
    this.createEnrollment({ studentId: 6, subjectId: 4 }); // Emma in Literature
    
    // Create schedule items
    const currentDate = new Date();
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);
    
    // Create example schedule
    this.createScheduleItem({
      subjectId: 1, // Calculus
      dayOfWeek: 1, // Monday
      startTime: "09:00:00",
      endTime: "10:30:00",
      roomNumber: "302"
    });
    
    this.createScheduleItem({
      subjectId: 2, // Chemistry
      dayOfWeek: 1, // Monday
      startTime: "11:00:00",
      endTime: "13:30:00",
      roomNumber: "Lab 201"
    });
    
    this.createScheduleItem({
      subjectId: 3, // Physics
      dayOfWeek: 1, // Monday
      startTime: "14:00:00",
      endTime: "15:30:00",
      roomNumber: "105"
    });
    
    this.createScheduleItem({
      subjectId: 4, // Literature
      dayOfWeek: 2, // Tuesday
      startTime: "09:00:00",
      endTime: "10:30:00",
      roomNumber: "201"
    });
    
    this.createScheduleItem({
      subjectId: 5, // History
      dayOfWeek: 3, // Wednesday
      startTime: "13:00:00",
      endTime: "14:30:00",
      roomNumber: "103"
    });
    
    // Create assignments
    const mathAssignment = this.createAssignment({
      title: "Math Analysis Midterm",
      description: "Complete the midterm exam covering differential equations and vector calculus.",
      subjectId: 1,
      dueDate: tomorrow,
      createdBy: 2 // David Miller
    });
    
    const literatureAssignment = this.createAssignment({
      title: "Literature Review Essay",
      description: "Write a 5-page analytical essay on the works of Shakespeare.",
      subjectId: 4, 
      dueDate: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      createdBy: 2 // David Miller
    });
    
    const chemistryAssignment = this.createAssignment({
      title: "Chemical Reactions Lab Report",
      description: "Document and analyze the results of the in-class chemical reactions experiment.",
      subjectId: 2,
      dueDate: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      createdBy: 3 // Sarah Johnson
    });
    
    const historyAssignment = this.createAssignment({
      title: "History Timeline Project",
      description: "Create a comprehensive timeline of major historical events in the 20th century.",
      subjectId: 5,
      dueDate: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      createdBy: 3 // Sarah Johnson
    });
    
    // Create submissions
    this.createSubmission({
      assignmentId: 1, // Math
      studentId: 5, // Alex
      content: "Partially completed midterm",
      status: "in_progress"
    });
    
    this.createSubmission({
      assignmentId: 2, // Literature
      studentId: 5, // Alex
      content: "Draft of essay introduction",
      status: "in_progress"
    });
    
    this.createSubmission({
      assignmentId: 3, // Chemistry
      studentId: 5, // Alex
      content: null,
      status: "not_started"
    });
    
    this.createSubmission({
      assignmentId: 4, // History
      studentId: 5, // Alex
      content: "Completed timeline with all major events",
      fileUrl: "/files/timeline.pdf",
      status: "completed"
    });
    
    // Create grades
    this.createGrade({
      studentId: 5, // Alex
      subjectId: 5, // History
      assignmentId: 4, // History assignment
      score: 95,
      maxScore: 100,
      comments: "Excellent work! Very thorough research."
    });
    
    this.createGrade({
      studentId: 5, // Alex
      subjectId: 1, // Calculus
      assignmentId: null, // Quiz
      score: 85,
      maxScore: 100,
      comments: "Good understanding of concepts. Work on the applications section."
    });
    
    // Create invoices and documents
    this.createDocument({
      userId: 5, // Alex
      title: "Fall Semester Tuition",
      type: "invoice",
      fileUrl: "/documents/tuition_invoice.pdf",
      createdBy: 1 // Admin
    });
    
    this.createDocument({
      userId: 5, // Alex
      title: "Academic Transcript",
      type: "certificate",
      fileUrl: "/documents/transcript.pdf",
      createdBy: 1 // Admin
    });
    
    // Create student requests
    this.createRequest({
      studentId: 5, // Alex
      type: "payment_deferral",
      description: "Request to defer payment of Fall semester tuition by 30 days due to financial aid processing delay."
    });
    
    // Create notifications
    this.createNotification({
      userId: 5, // Alex
      title: "Assignment Due Soon",
      content: "Your Math Analysis midterm assignment is due tomorrow.",
      relatedId: 1, // Math assignment
      relatedType: "assignment"
    });
    
    this.createNotification({
      userId: 5, // Alex
      title: "Grade Posted",
      content: "Prof. Sarah Johnson has posted your grade for the Chemistry quiz.",
      relatedId: 2, // Chemistry grade
      relatedType: "grade"
    });
    
    this.createNotification({
      userId: 5, // Alex
      title: "Request Update",
      content: "Your payment deferral request has been approved.",
      relatedId: 1, // Request
      relatedType: "request"
    });
    
    this.createNotification({
      userId: 5, // Alex
      title: "New Document",
      content: "Your Fall semester invoice is now available.",
      relatedId: 1, // Invoice
      relatedType: "document"
    });
    
    // Create messages
    this.createMessage({
      fromUserId: 3, // Sarah
      toUserId: 5, // Alex
      content: "Hi Alex, please make sure to submit your lab report by Friday."
    });
    
    this.createMessage({
      fromUserId: 5, // Alex
      toUserId: 3, // Sarah
      content: "I will, Professor Johnson. Thank you for the reminder."
    });
  }
}

export const storage = new MemStorage();
