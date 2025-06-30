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
  Task, InsertTask,
  // Curriculum Plans
  CurriculumPlan, InsertCurriculumPlan,
  // User Preferences
  UserPreferences, InsertUserPreferences
} from "@shared/schema";
import { SupabaseStorage } from "./db/storage";

import { logger } from "./utils/logger";

// Storage interface
export interface IStorage {
  // User management
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(
    role: 'student' | 'teacher' | 'admin' | 'director'
  ): Promise<User[]>;
  getAllAdminUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  authenticate(credentials: LoginCredentials): Promise<User | undefined>;
  
  // Subjects
  getSubjects(): Promise<Subject[]>;
  getSubject(id: string): Promise<Subject | undefined>;
  getSubjectsByTeacher(teacherId: string): Promise<Subject[]>; // UUID
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: string, subjectData: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: string): Promise<boolean>;
  
  // Enrollments
  getEnrollments(): Promise<Enrollment[]>;
  getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]>; // UUID
  getEnrollmentsBySubject(subjectId: string): Promise<Enrollment[]>;
  getStudentsBySubject(subjectId: string): Promise<User[]>;
  getSubjectsByStudent(studentId: string): Promise<Subject[]>; // UUID
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  deleteEnrollment(id: string): Promise<boolean>;
  
  // Schedule
  getScheduleItems(): Promise<ScheduleItem[]>;
  getScheduleItem(id: string): Promise<ScheduleItem | undefined>;
  getScheduleItemsBySubject(subjectId: string): Promise<ScheduleItem[]>;
  getScheduleItemsByStudent(studentId: string): Promise<(ScheduleItem & { subject: Subject })[]>; // UUID
  getScheduleItemsByTeacher(teacherId: string): Promise<(ScheduleItem & { subject: Subject })[]>; // UUID
  createScheduleItem(scheduleItem: InsertScheduleItem): Promise<ScheduleItem>;
  updateScheduleItem(id: string, scheduleItemData: Partial<InsertScheduleItem>): Promise<ScheduleItem | undefined>;
  deleteScheduleItem(id: string): Promise<boolean>;
  
  // Assignments
  getAssignments(): Promise<Assignment[]>;
  getAssignment(id: string): Promise<Assignment | undefined>;
  getAssignmentsBySubject(subjectId: string): Promise<Assignment[]>;
  getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]>; // UUID
  getAssignmentsByStudent(studentId: string): Promise<Assignment[]>; // UUID
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: string): Promise<boolean>;
  
  // Submissions
  getSubmissions(): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: string): Promise<Submission[]>; // UUID
  getSubmissionByAssignmentAndStudent(assignmentId: string, studentId: string): Promise<Submission | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, submissionData: Partial<InsertSubmission>): Promise<Submission | undefined>;
  deleteSubmission(id: string): Promise<boolean>;
  
  // Grades
  getGrades(): Promise<Grade[]>;
  getGrade(id: string): Promise<Grade | undefined>;
  getGradesByStudent(studentId: string): Promise<Grade[]>; // UUID
  getGradesBySubject(subjectId: string): Promise<Grade[]>;
  getGradesByStudentAndSubject(studentId: string, subjectId: string): Promise<Grade[]>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  updateGrade(id: string, gradeData: Partial<InsertGrade>): Promise<Grade | undefined>;
  deleteGrade(id: string): Promise<boolean>;
  
  // Requests
  getRequests(): Promise<Request[]>;
  getRequest(id: string): Promise<Request | undefined>;
  getRequestsByStudent(studentId: string): Promise<Request[]>; // UUID
  getPendingRequests(): Promise<Request[]>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequestStatus(id: string, status: 'pending' | 'approved' | 'rejected', resolvedBy: string, resolution?: string): Promise<Request | undefined>;
  deleteRequest(id: string): Promise<boolean>;
  
  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByUser(userId: string): Promise<Document[]>; // UUID
  getDocumentsByType(userId: string, type: string): Promise<Document[]>; // UUID
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, documentData: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  
  // Messages
  getMessages(): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByUser(userId: string): Promise<Message[]>; // UUID
  getMessagesBetweenUsers(fromUserId: string, toUserId: string): Promise<Message[]>; // UUIDs
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageStatus(id: string, status: 'delivered' | 'read'): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;
  
  // Notifications
  getNotifications(): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>; // UUID
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>; // UUID
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;

  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(userId: string, prefs: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined>;
  
  // Специальности
  getSpecialties(): Promise<Specialty[]>;
  getSpecialty(id: string): Promise<Specialty | undefined>;
  createSpecialty(specialty: InsertSpecialty): Promise<Specialty>;
  updateSpecialty(id: string, specialtyData: Partial<InsertSpecialty>): Promise<Specialty | undefined>;
  deleteSpecialty(id: string): Promise<boolean>;
  
  // Курсы
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  getCoursesBySpecialty(specialtyId: string): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, courseData: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  
  // Группы
  getGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  getGroupsByCourse(courseId: string): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, groupData: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  
  // Расписание для групп
  getScheduleEntries(): Promise<ScheduleEntry[]>;
  getScheduleEntry(id: string): Promise<ScheduleEntry | undefined>;
  getScheduleEntriesByGroup(groupId: string): Promise<ScheduleEntry[]>;
  getScheduleEntriesByTeacher(teacherId: string): Promise<ScheduleEntry[]>; // UUID
  getScheduleEntriesBySubject(subjectId: string): Promise<ScheduleEntry[]>;
  createScheduleEntry(scheduleEntry: InsertScheduleEntry): Promise<ScheduleEntry>;
  updateScheduleEntry(id: string, scheduleEntryData: Partial<InsertScheduleEntry>): Promise<ScheduleEntry | undefined>;
  deleteScheduleEntry(id: string): Promise<boolean>;
  
  // Поиск и обслуживание расписания
  getTeacherByName(fullName: string): Promise<User | undefined>;
  getOrCreateSubject(name: string, teacherId?: string, roomNumber?: string): Promise<Subject>;
  getOrCreateSpecialty(name: string, code?: string): Promise<Specialty>;
  getOrCreateCourse(number: number, specialtyId: string, academicYear: string): Promise<Course>;
  getOrCreateGroup(name: string, courseId: string): Promise<Group>;
  
  // Импортированные файлы
  getImportedFiles(): Promise<ImportedFile[]>;
  getImportedFile(id: string): Promise<ImportedFile | undefined>;
  getImportedFilesByUser(userId: string): Promise<ImportedFile[]>; // UUID
  createImportedFile(fileData: InsertImportedFile): Promise<ImportedFile>;
  deleteImportedFile(id: string): Promise<boolean>;
  getImportedFilesByType(type: 'csv' | 'google-sheets'): Promise<ImportedFile[]>;
  
  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>; 
  createActivityLog(logData: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByType(type: string, limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string, limit?: number): Promise<ActivityLog[]>; // UUID
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTaskById(id: string): Promise<Task | null>; // Добавляем другой формат возврата для совместимости
  getTasksByClient(clientId: string): Promise<Task[]>; // UUID
  getTasksByExecutor(executorId: string): Promise<Task[]>; // UUID
  getTasksByUser(userId: string): Promise<Task[]>; // UUID
  getTasksByStatus(status: string): Promise<Task[]>;
  getTasksDueSoon(days: number): Promise<Task[]>;
  createTask(taskData: InsertTask): Promise<Task>;
  updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  
  // Curriculum Plans (Учебные планы)
  getCurriculumPlans(): Promise<CurriculumPlan[]>;
  getCurriculumPlan(id: string): Promise<CurriculumPlan | undefined>;
  getCurriculumPlansByEducationLevel(
    level: 'СПО' | 'ВО' | 'Магистратура' | 'Аспирантура'
  ): Promise<CurriculumPlan[]>;
  createCurriculumPlan(planData: InsertCurriculumPlan): Promise<CurriculumPlan>;
  updateCurriculumPlan(id: string, planData: Partial<InsertCurriculumPlan>): Promise<CurriculumPlan | undefined>;
  deleteCurriculumPlan(id: string): Promise<boolean>;
}


// Класс для работы с базой данных через Drizzle ORM
// Реализация работы с Supabase вынесена в отдельный модуль server/db/storage.ts
// Здесь мы просто реэкспортируем эту реализацию для обратной совместимости.
export { SupabaseStorage, SupabaseStorage as DatabaseStorage } from "./db/storage";
// Создаем хранилище, которое может быть заменено базой данных
let _storage: IStorage = new SupabaseStorage() as unknown as IStorage;

// Экспортируем геттер, чтобы всегда получать актуальную версию хранилища
export const getStorage = (): IStorage => _storage;

// Экспортируем сеттер для обновления хранилища из других модулей (например, auth.ts)
export const setStorage = (newStorage: IStorage): void => {
  _storage = newStorage;
  logger.info('Storage implementation has been updated');
};

