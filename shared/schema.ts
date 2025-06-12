import { pgTable, text, serial, integer, boolean, timestamp, date, time, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['student', 'teacher', 'admin', 'director']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['not_started', 'in_progress', 'completed', 'graded']);
export const requestStatusEnum = pgEnum('request_status', ['pending', 'approved', 'rejected']);
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read']);
export const dayOfWeekEnum = pgEnum('day_of_week', ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']);
export const importStatusEnum = pgEnum('import_status', ['success', 'partial', 'failed', 'error']);
export const activityTypeEnum = pgEnum('activity_type', ['file_upload', 'file_delete', 'teacher_assign', 'user_create', 'user_delete', 'subject_create', 'schedule_change', 'other']);
export const taskPriorityEnum = pgEnum('task_priority', ['high', 'medium', 'low']);
export const taskStatusEnum = pgEnum('task_status', ['new', 'in_progress', 'completed', 'on_hold']);
export const educationLevelEnum = pgEnum('education_level', ['СПО', 'ВО', 'Магистратура', 'Аспирантура']);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Classes/Subjects Table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  description: text("description"),
  teacherId: integer("teacher_id").references(() => users.id).index(),
  roomNumber: text("room_number"),
  color: text("color"), // Цвет для визуального отображения предмета в расписании
});

// Student-Subject Enrollment
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull().index(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull().index(),
});

// Schedule Items
export const scheduleItems = pgTable("schedule_items", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull().index(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  roomNumber: text("room_number"),
  teacherName: text("teacher_name"), // Имя преподавателя как строка, без связи с пользователями
  importedFileId: integer("imported_file_id"), // Связь с файлом импорта, если запись была импортирована
});

// Assignments Table
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjects.id).notNull().index(),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id).notNull().index(),
});

// Assignment Submissions
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => assignments.id).notNull().index(),
  studentId: integer("student_id").references(() => users.id).notNull().index(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  content: text("content"),
  fileUrl: text("file_url"),
  status: assignmentStatusEnum("status").notNull().default('not_started'),
  grade: integer("grade"),
  feedback: text("feedback"),
});

// Student Grades
export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull().index(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull().index(),
  assignmentId: integer("assignment_id").references(() => assignments.id).index(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student Requests
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull().index(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  status: requestStatusEnum("status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
});

// Documents (Invoices, Certificates)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().index(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id).index(),
});

// Chat Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull().index(),
  toUserId: integer("to_user_id").references(() => users.id).notNull().index(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  status: messageStatusEnum("status").notNull().default('sent'),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().index(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  relatedId: integer("related_id"),
  relatedType: text("related_type"),
});

// Новые таблицы для структуры Курс-Специальность-Группа

// Специальности
export const specialties = pgTable("specialties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: varchar("code", { length: 50 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Курсы
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(), // номер курса (1, 2, 3, 4 и т.д.)
  specialtyId: integer("specialty_id").references(() => specialties.id).notNull().index(),
  academicYear: varchar("academic_year", { length: 20 }).notNull(), // учебный год в формате "2023-2024"
  createdAt: timestamp("created_at").defaultNow(),
});

// Группы
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // например, "ИП-21-1"
  courseId: integer("course_id").references(() => courses.id).notNull().index(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Записи расписания для групп
export const scheduleEntries = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id).notNull().index(),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull().index(),
  teacherId: integer("teacher_id").references(() => users.id).index(),
  roomNumber: varchar("room_number", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Загруженные файлы импорта расписания
export const importedFiles = pgTable("imported_files", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  importType: text("import_type").notNull(), // 'csv', 'google-sheets'
  status: importStatusEnum("status").notNull(),
  itemsCount: integer("items_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull().index(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  errorDetails: text("error_details"),
});

// Activity Log - tracking system events for the activity feed
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").references(() => users.id).notNull().index(), // Who performed the action
  timestamp: timestamp("timestamp").defaultNow(),
  entityId: integer("entity_id"), // ID of the affected entity (file, user, subject, etc.)
  entityType: text("entity_type"), // Type of the affected entity
  metadata: text("metadata"), // JSON string with additional data if needed
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  dueDate: timestamp("due_date"),
  priority: taskPriorityEnum("priority").notNull().default('medium'),
  status: taskStatusEnum("status").notNull().default('new'),
  clientId: integer("client_id").references(() => users.id).notNull().index(), // кто поставил задачу (заказчик)
  executorId: integer("executor_id").references(() => users.id).notNull().index(), // кто исполняет задачу
});

// Учебные планы (Curriculum Plans)
export const curriculumPlans = pgTable("curriculum_plans", {
  id: serial("id").primaryKey(),
  specialtyName: text("specialty_name").notNull(), // Название специальности
  specialtyCode: varchar("specialty_code", { length: 50 }).notNull(), // Код специальности
  yearsOfStudy: integer("years_of_study").notNull(), // Количество лет обучения
  monthsOfStudy: integer("months_of_study").default(0), // Дополнительные месяцы обучения
  startYear: integer("start_year"), // Год начала подготовки
  endYear: integer("end_year"), // Год окончания подготовки
  educationForm: varchar("education_form", { length: 50 }), // Форма обучения (очная, заочная и т.д.)
  educationLevel: educationLevelEnum("education_level").notNull(), // Уровень образования (СПО, ВО и т.д.)
  description: text("description"), // Описание учебного плана
  calendarData: text("calendar_data"), // Данные календаря (JSON-строка)
  curriculumPlanData: text("curriculum_plan_data"), // Данные учебного плана (JSON-строка)
  createdBy: integer("created_by").references(() => users.id).index(), // Кто создал план
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true,
  createdAt: true
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true
});

export const insertScheduleItemSchema = createInsertSchema(scheduleItems).omit({
  id: true
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  resolvedBy: true,
  status: true
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
  status: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});

// Insert схемы для новых моделей
export const insertSpecialtySchema = createInsertSchema(specialties).omit({
  id: true,
  createdAt: true
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true
});

export const insertScheduleEntrySchema = createInsertSchema(scheduleEntries).omit({
  id: true,
  createdAt: true
});

export const insertImportedFileSchema = createInsertSchema(importedFiles).omit({
  id: true,
  uploadedAt: true
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCurriculumPlanSchema = createInsertSchema(curriculumPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserSummary = Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;

export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type InsertScheduleItem = z.infer<typeof insertScheduleItemSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;

export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Типы для новых моделей
export type Specialty = typeof specialties.$inferSelect;
export type InsertSpecialty = z.infer<typeof insertSpecialtySchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
export type InsertScheduleEntry = z.infer<typeof insertScheduleEntrySchema>;

export type ImportedFile = typeof importedFiles.$inferSelect;
export type InsertImportedFile = z.infer<typeof insertImportedFileSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type CurriculumPlan = typeof curriculumPlans.$inferSelect;
export type InsertCurriculumPlan = z.infer<typeof insertCurriculumPlanSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
