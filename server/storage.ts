import { 
  User, InsertUser, Subject, InsertSubject, Enrollment, InsertEnrollment,
  ScheduleItem, InsertScheduleItem, Assignment, InsertAssignment,
  Submission, InsertSubmission, Grade, InsertGrade, Request, InsertRequest,
  Document, InsertDocument, Message, InsertMessage, Notification, InsertNotification,
  LoginCredentials,
  // Новые модели
  Specialty, InsertSpecialty, Course, InsertCourse, Group, InsertGroup,
  ScheduleEntry, InsertScheduleEntry, ImportedFile, InsertImportedFile,
  ActivityLog, InsertActivityLog,
  // Task Manager
  Task, InsertTask
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
  getUsersByRole(role: string): Promise<User[]>;
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
  
  // Специальности
  getSpecialties(): Promise<Specialty[]>;
  getSpecialty(id: number): Promise<Specialty | undefined>;
  createSpecialty(specialty: InsertSpecialty): Promise<Specialty>;
  updateSpecialty(id: number, specialtyData: Partial<InsertSpecialty>): Promise<Specialty | undefined>;
  deleteSpecialty(id: number): Promise<boolean>;
  
  // Курсы
  getCourses(): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  getCoursesBySpecialty(specialtyId: number): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, courseData: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: number): Promise<boolean>;
  
  // Группы
  getGroups(): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  getGroupsByCourse(courseId: number): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, groupData: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;
  
  // Расписание для групп
  getScheduleEntries(): Promise<ScheduleEntry[]>;
  getScheduleEntry(id: number): Promise<ScheduleEntry | undefined>;
  getScheduleEntriesByGroup(groupId: number): Promise<ScheduleEntry[]>;
  getScheduleEntriesByTeacher(teacherId: number): Promise<ScheduleEntry[]>;
  getScheduleEntriesBySubject(subjectId: number): Promise<ScheduleEntry[]>;
  createScheduleEntry(scheduleEntry: InsertScheduleEntry): Promise<ScheduleEntry>;
  updateScheduleEntry(id: number, scheduleEntryData: Partial<InsertScheduleEntry>): Promise<ScheduleEntry | undefined>;
  deleteScheduleEntry(id: number): Promise<boolean>;
  
  // Поиск и обслуживание расписания
  getTeacherByName(fullName: string): Promise<User | undefined>;
  getOrCreateSubject(name: string, teacherId?: number, roomNumber?: string): Promise<Subject>;
  getOrCreateSpecialty(name: string, code?: string): Promise<Specialty>;
  getOrCreateCourse(number: number, specialtyId: number, academicYear: string): Promise<Course>;
  getOrCreateGroup(name: string, courseId: number): Promise<Group>;
  
  // Импортированные файлы
  getImportedFiles(): Promise<ImportedFile[]>;
  getImportedFile(id: number): Promise<ImportedFile | undefined>;
  getImportedFilesByUser(userId: number): Promise<ImportedFile[]>;
  createImportedFile(fileData: InsertImportedFile): Promise<ImportedFile>;
  deleteImportedFile(id: number): Promise<boolean>;
  getImportedFilesByType(type: 'csv' | 'google-sheets'): Promise<ImportedFile[]>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>; 
  createActivityLog(logData: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByType(type: string, limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: number, limit?: number): Promise<ActivityLog[]>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByClient(clientId: number): Promise<Task[]>;
  getTasksByExecutor(executorId: number): Promise<Task[]>;
  getTasksByStatus(status: string): Promise<Task[]>;
  getTasksDueSoon(days: number): Promise<Task[]>;
  createTask(taskData: InsertTask): Promise<Task>;
  updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
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
  
  // Новые модели
  private specialties: Map<number, Specialty>;
  private courses: Map<number, Course>;
  private groups: Map<number, Group>;
  private scheduleEntries: Map<number, ScheduleEntry>;
  private importedFiles: Map<number, ImportedFile>;
  private activityLogs: Map<number, ActivityLog>;
  private tasks: Map<number, Task>;
  
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
  
  // Счетчики для новых моделей
  private specialtyIdCounter: number;
  private courseIdCounter: number;
  private groupIdCounter: number;
  private scheduleEntryIdCounter: number;
  private importedFileIdCounter: number;
  private activityLogIdCounter: number;
  private taskIdCounter: number;
  
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
    
    // Инициализация новых хранилищ
    this.specialties = new Map();
    this.courses = new Map();
    this.groups = new Map();
    this.scheduleEntries = new Map();
    this.importedFiles = new Map();
    this.activityLogs = new Map();
    this.tasks = new Map();
    
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
    
    // Инициализация счетчиков для новых моделей
    this.specialtyIdCounter = 1;
    this.courseIdCounter = 1;
    this.groupIdCounter = 1;
    this.scheduleEntryIdCounter = 1;
    this.importedFileIdCounter = 1;
    this.activityLogIdCounter = 1;
    this.taskIdCounter = 1;
    
    // Настройка MemoryStore для длительного хранения сессий
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // проверка и удаление устаревших сессий каждые 24ч
      max: 5000, // максимальное количество сессий в памяти
      ttl: 14 * 24 * 60 * 60 * 1000, // время жизни сессии - 14 дней
      stale: false // не возвращать просроченные объекты
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
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
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
  
  async getScheduleItemsByStudent(studentId: number): Promise<(ScheduleItem & { subject: Subject & { teacher?: User } })[]> {
    const subjects = await this.getSubjectsByStudent(studentId);
    const subjectIds = subjects.map(subject => subject.id);
    
    const scheduleItems = Array.from(this.scheduleItems.values())
      .filter(item => subjectIds.includes(item.subjectId));
    
    return Promise.all(scheduleItems.map(async item => {
      const subject = this.subjects.get(item.subjectId);
      if (!subject) {
        throw new Error(`Subject with ID ${item.subjectId} not found for schedule item ${item.id}`);
      }
      
      // Получаем информацию о преподавателе, если он указан
      let teacher = undefined;
      if (subject.teacherId) {
        teacher = this.users.get(subject.teacherId);
      }
      
      return { 
        ...item, 
        subject: { 
          ...subject,
          teacher
        } 
      };
    }));
  }
  
  async getScheduleItemsByTeacher(teacherId: number): Promise<(ScheduleItem & { subject: Subject & { teacher?: User } })[]> {
    const subjects = await this.getSubjectsByTeacher(teacherId);
    const subjectIds = subjects.map(subject => subject.id);
    
    const scheduleItems = Array.from(this.scheduleItems.values())
      .filter(item => subjectIds.includes(item.subjectId));
    
    return Promise.all(scheduleItems.map(async item => {
      const subject = this.subjects.get(item.subjectId);
      if (!subject) {
        throw new Error(`Subject with ID ${item.subjectId} not found for schedule item ${item.id}`);
      }
      
      // Получаем информацию о преподавателе, если он указан
      let teacher = undefined;
      if (subject.teacherId) {
        teacher = this.users.get(subject.teacherId);
      }
      
      return { 
        ...item, 
        subject: { 
          ...subject,
          teacher
        } 
      };
    }));
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
  // Specialties
  async getSpecialties(): Promise<Specialty[]> {
    return Array.from(this.specialties.values());
  }
  
  async getSpecialty(id: number): Promise<Specialty | undefined> {
    return this.specialties.get(id);
  }
  
  async createSpecialty(specialtyData: InsertSpecialty): Promise<Specialty> {
    const id = this.specialtyIdCounter++;
    const specialty: Specialty = { 
      ...specialtyData, 
      id, 
      createdAt: new Date() 
    };
    this.specialties.set(id, specialty);
    return specialty;
  }
  
  async updateSpecialty(id: number, specialtyData: Partial<InsertSpecialty>): Promise<Specialty | undefined> {
    const specialty = this.specialties.get(id);
    if (!specialty) return undefined;
    
    const updatedSpecialty = { ...specialty, ...specialtyData };
    this.specialties.set(id, updatedSpecialty);
    return updatedSpecialty;
  }
  
  async deleteSpecialty(id: number): Promise<boolean> {
    return this.specialties.delete(id);
  }
  
  // Courses
  async getCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }
  
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }
  
  async getCoursesBySpecialty(specialtyId: number): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(course => course.specialtyId === specialtyId);
  }
  
  async createCourse(courseData: InsertCourse): Promise<Course> {
    const id = this.courseIdCounter++;
    const course: Course = { 
      ...courseData, 
      id, 
      createdAt: new Date() 
    };
    this.courses.set(id, course);
    return course;
  }
  
  async updateCourse(id: number, courseData: Partial<InsertCourse>): Promise<Course | undefined> {
    const course = this.courses.get(id);
    if (!course) return undefined;
    
    const updatedCourse = { ...course, ...courseData };
    this.courses.set(id, updatedCourse);
    return updatedCourse;
  }
  
  async deleteCourse(id: number): Promise<boolean> {
    return this.courses.delete(id);
  }
  
  // Groups
  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }
  
  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }
  
  async getGroupsByCourse(courseId: number): Promise<Group[]> {
    return Array.from(this.groups.values()).filter(group => group.courseId === courseId);
  }
  
  async createGroup(groupData: InsertGroup): Promise<Group> {
    const id = this.groupIdCounter++;
    const group: Group = { 
      ...groupData, 
      id, 
      createdAt: new Date() 
    };
    this.groups.set(id, group);
    return group;
  }
  
  async updateGroup(id: number, groupData: Partial<InsertGroup>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...groupData };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }
  
  async deleteGroup(id: number): Promise<boolean> {
    return this.groups.delete(id);
  }
  
  // Schedule entries
  async getScheduleEntries(): Promise<ScheduleEntry[]> {
    return Array.from(this.scheduleEntries.values());
  }
  
  async getScheduleEntry(id: number): Promise<ScheduleEntry | undefined> {
    return this.scheduleEntries.get(id);
  }
  
  async getScheduleEntriesByGroup(groupId: number): Promise<ScheduleEntry[]> {
    return Array.from(this.scheduleEntries.values()).filter(entry => entry.groupId === groupId);
  }
  
  async getScheduleEntriesByTeacher(teacherId: number): Promise<ScheduleEntry[]> {
    const subjects = await this.getSubjectsByTeacher(teacherId);
    const subjectIds = subjects.map(subject => subject.id);
    
    return Array.from(this.scheduleEntries.values())
      .filter(entry => subjectIds.includes(entry.subjectId));
  }
  
  async getScheduleEntriesBySubject(subjectId: number): Promise<ScheduleEntry[]> {
    return Array.from(this.scheduleEntries.values())
      .filter(entry => entry.subjectId === subjectId);
  }
  
  async createScheduleEntry(scheduleEntryData: InsertScheduleEntry): Promise<ScheduleEntry> {
    const id = this.scheduleEntryIdCounter++;
    const scheduleEntry: ScheduleEntry = { 
      ...scheduleEntryData, 
      id, 
      createdAt: new Date(),
      teacherId: scheduleEntryData.teacherId || null,
      roomNumber: scheduleEntryData.roomNumber || null
    };
    this.scheduleEntries.set(id, scheduleEntry);
    return scheduleEntry;
  }
  
  async updateScheduleEntry(id: number, scheduleEntryData: Partial<InsertScheduleEntry>): Promise<ScheduleEntry | undefined> {
    const scheduleEntry = this.scheduleEntries.get(id);
    if (!scheduleEntry) return undefined;
    
    const updatedScheduleEntry = { ...scheduleEntry, ...scheduleEntryData };
    this.scheduleEntries.set(id, updatedScheduleEntry);
    return updatedScheduleEntry;
  }
  
  async deleteScheduleEntry(id: number): Promise<boolean> {
    return this.scheduleEntries.delete(id);
  }
  
  // Поиск и создание записей для импорта расписания
  async getTeacherByName(fullName: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => {
      const teacherFullName = `${user.lastName} ${user.firstName}`.trim();
      return user.role === 'teacher' && teacherFullName === fullName;
    });
  }
  
  async getOrCreateSubject(name: string, teacherId?: number, roomNumber?: string): Promise<Subject> {
    // Ищем предмет по названию и преподавателю (если указан)
    const existingSubject = Array.from(this.subjects.values()).find(subject => {
      if (teacherId) {
        return subject.name === name && subject.teacherId === teacherId;
      }
      return subject.name === name;
    });
    
    if (existingSubject) {
      // Если нашли предмет, но нужно обновить номер кабинета
      if (roomNumber && existingSubject.roomNumber !== roomNumber) {
        return this.updateSubject(existingSubject.id, { roomNumber }) as Promise<Subject>;
      }
      return existingSubject;
    }
    
    // Создаем новый предмет
    return this.createSubject({
      name,
      teacherId: teacherId || null,
      roomNumber: roomNumber || null,
      description: null
    });
  }
  
  async getOrCreateSpecialty(name: string, code?: string): Promise<Specialty> {
    // Ищем специальность по названию
    const existingSpecialty = Array.from(this.specialties.values()).find(
      specialty => specialty.name === name
    );
    
    if (existingSpecialty) {
      // Если нашли специальность, но нужно обновить код
      if (code && existingSpecialty.code !== code) {
        return this.updateSpecialty(existingSpecialty.id, { code }) as Promise<Specialty>;
      }
      return existingSpecialty;
    }
    
    // Создаем новую специальность
    return this.createSpecialty({
      name,
      code: code || null,
      description: null
    });
  }
  
  async getOrCreateCourse(number: number, specialtyId: number, academicYear: string): Promise<Course> {
    // Ищем курс по номеру, специальности и учебному году
    const existingCourse = Array.from(this.courses.values()).find(
      course => course.number === number && 
               course.specialtyId === specialtyId && 
               course.academicYear === academicYear
    );
    
    if (existingCourse) {
      return existingCourse;
    }
    
    // Создаем новый курс
    return this.createCourse({
      number,
      specialtyId,
      academicYear
    });
  }
  
  async getOrCreateGroup(name: string, courseId: number): Promise<Group> {
    // Ищем группу по названию и курсу
    const existingGroup = Array.from(this.groups.values()).find(
      group => group.name === name && group.courseId === courseId
    );
    
    if (existingGroup) {
      return existingGroup;
    }
    
    // Создаем новую группу
    return this.createGroup({
      name,
      courseId
    });
  }
  
  // Импортированные файлы
  async getImportedFiles(): Promise<ImportedFile[]> {
    return Array.from(this.importedFiles.values());
  }
  
  async getImportedFile(id: number): Promise<ImportedFile | undefined> {
    return this.importedFiles.get(id);
  }
  
  async getImportedFilesByUser(userId: number): Promise<ImportedFile[]> {
    return Array.from(this.importedFiles.values())
      .filter(file => file.uploadedBy === userId);
  }
  
  async getImportedFilesByType(type: 'csv' | 'google-sheets'): Promise<ImportedFile[]> {
    return Array.from(this.importedFiles.values())
      .filter(file => file.importType === type);
  }
  
  async createImportedFile(fileData: InsertImportedFile): Promise<ImportedFile> {
    const id = this.importedFileIdCounter++;
    const uploadedAt = new Date();
    
    const importedFile: ImportedFile = {
      ...fileData,
      id,
      uploadedAt,
      status: fileData.status || 'success'
    };
    
    this.importedFiles.set(id, importedFile);
    
    // Create activity log for file upload
    await this.createActivityLog({
      userId: fileData.uploadedBy,
      type: 'file_upload',
      description: `Uploaded ${fileData.importType} file: ${fileData.originalName}`,
      entityId: id,
      entityType: 'imported_file',
      metadata: JSON.stringify({
        fileName: fileData.originalName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        status: fileData.status
      })
    });
    
    return importedFile;
  }
  
  async deleteImportedFile(id: number): Promise<boolean> {
    try {
      console.log(`In-Memory: Deleting imported file with ID: ${id}`);
      
      // First check if the file exists
      if (!this.importedFiles.has(id)) {
        console.error(`In-Memory: ImportedFile with ID ${id} not found`);
        return false;
      }
      
      // Get file data for activity log before deletion
      const file = this.importedFiles.get(id);
      
      // Get all schedule items that need to be deleted
      const itemsToDelete = Array.from(this.scheduleItems.values())
        .filter(item => item.importedFileId === id);
      
      console.log(`In-Memory: Found ${itemsToDelete.length} schedule items to delete for import file ${id}`);
      
      // Delete all associated schedule items
      for (const item of itemsToDelete) {
        this.scheduleItems.delete(item.id);
      }
      console.log(`In-Memory: Deleted ${itemsToDelete.length} schedule items associated with import file ${id}`);
      
      // Then delete the import file record
      const result = this.importedFiles.delete(id);
      console.log(`In-Memory: Deleted imported file record: ${result ? 'success' : 'failed'}`);
      
      // Create activity log for file deletion if successful
      if (result && file) {
        await this.createActivityLog({
          userId: file.uploadedBy,
          type: 'file_delete',
          description: `Deleted ${file.importType} file: ${file.originalName}. File deletion affected ${itemsToDelete.length} schedule items`,
          entityId: id,
          entityType: 'imported_file',
          metadata: JSON.stringify({
            fileName: file.originalName,
            fileSize: file.fileSize,
            itemsDeleted: itemsToDelete.length
          })
        });
      }
      
      return result;
    } catch (error) {
      console.error('In-Memory: Error in deleteImportedFile:', error);
      // Print detailed error information for debugging
      if (error instanceof Error) {
        console.error('In-Memory: Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      return false;
    }
  }
  
  // Activity Logs
  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values());
    // Sort by timestamp in descending order (newest first)
    logs.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    return limit ? logs.slice(0, limit) : logs;
  }
  
  async createActivityLog(logData: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const now = new Date();
    
    const log: ActivityLog = {
      ...logData,
      id,
      timestamp: now,
      entityId: logData.entityId || null,
      entityType: logData.entityType || null,
      metadata: logData.metadata || null
    };
    
    this.activityLogs.set(id, log);
    return log;
  }
  
  async getActivityLogsByType(type: string, limit?: number): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values())
      .filter(log => log.type === type);
    
    // Sort by timestamp in descending order (newest first)
    logs.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    return limit ? logs.slice(0, limit) : logs;
  }
  
  async getActivityLogsByUser(userId: number, limit?: number): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values())
      .filter(log => log.userId === userId);
    
    // Sort by timestamp in descending order (newest first)
    logs.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    return limit ? logs.slice(0, limit) : logs;
  }
  
  // Tasks
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async getTasksByClient(clientId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.clientId === clientId);
  }
  
  async getTasksByExecutor(executorId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.executorId === executorId);
  }
  
  async getTasksByStatus(status: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status);
  }
  
  async getTasksDueSoon(days: number): Promise<Task[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);
    
    return Array.from(this.tasks.values())
      .filter(task => {
        // Только задачи, которые не завершены
        if (task.status === 'completed') return false;
        
        // Проверка на дедлайн в ближайшие дни
        if (task.dueDate && task.dueDate > now && task.dueDate <= future) {
          return true;
        }
        return false;
      });
  }
  
  async createTask(taskData: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const now = new Date();
    
    const task: Task = {
      ...taskData,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      ...taskData,
      updatedAt: new Date()
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
  
  private seedData() {
    // Create admin user
    const adminUser = this.createUser({
      firstName: "Admin",
      lastName: "User",
      password: "admin123",
      email: "admin@eduportal.com",
      role: "admin"
    });
    
    // Создаем базовые специальности
    const computerScience = this.createSpecialty({
      name: "Информатика и вычислительная техника",
      code: "09.03.01",
      description: "Бакалавриат по информатике и вычислительной технике"
    });
    
    const economics = this.createSpecialty({
      name: "Экономика",
      code: "38.03.01",
      description: "Бакалавриат по экономике"
    });
    
    const softwareEngineering = this.createSpecialty({
      name: "Программная инженерия",
      code: "09.03.04",
      description: "Бакалавриат по программной инженерии"
    });
    
    // Создаем курсы
    const cs1 = this.createCourse({
      number: 1,
      specialtyId: 1, // Информатика, 1-й курс
      academicYear: "2024-2025"
    });
    
    const cs2 = this.createCourse({
      number: 2,
      specialtyId: 1, // Информатика, 2-й курс
      academicYear: "2024-2025"
    });
    
    const econ1 = this.createCourse({
      number: 1,
      specialtyId: 2, // Экономика, 1-й курс
      academicYear: "2024-2025"
    });
    
    const swe1 = this.createCourse({
      number: 1,
      specialtyId: 3, // Программная инженерия, 1-й курс
      academicYear: "2024-2025"
    });
    
    // Создаем группы
    const csGroup1 = this.createGroup({
      name: "ИВТ-101",
      courseId: 1 // Информатика, 1-й курс
    });
    
    const csGroup2 = this.createGroup({
      name: "ИВТ-102",
      courseId: 1 // Информатика, 1-й курс
    });
    
    const csGroup3 = this.createGroup({
      name: "ИВТ-201",
      courseId: 2 // Информатика, 2-й курс
    });
    
    const econGroup1 = this.createGroup({
      name: "ЭКО-101",
      courseId: 3 // Экономика, 1-й курс
    });
    
    const sweGroup1 = this.createGroup({
      name: "ПИ-101",
      courseId: 4 // Программная инженерия, 1-й курс
    });
  }
}

// Создаем хранилище, которое может быть заменено базой данных
let _storage: IStorage = new MemStorage();

// Экспортируем геттер, чтобы всегда получать актуальную версию хранилища
export const getStorage = (): IStorage => _storage;

// Экспортируем сеттер для обновления хранилища из других модулей (например, auth.ts)
export const setStorage = (newStorage: IStorage): void => {
  _storage = newStorage;
  console.log('Storage implementation has been updated');
};

// Для обратной совместимости экспортируем ссылку на хранилище
export const storage = _storage;
