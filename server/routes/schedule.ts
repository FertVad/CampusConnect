import { Express } from "express";
import { getStorage } from "../storage";
import { insertSubjectSchema, insertEnrollmentSchema, insertScheduleItemSchema } from "@shared/schema";
import { parseSheetDataToScheduleItems, fetchSheetData, authenticateWithGoogleSheets } from "../utils/googleSheetsHelper";
import { parseCsvToScheduleItems, validateScheduleItems, prepareImportResult } from "../utils/csvHelper";
import { db } from "../db";
import { logger } from "../utils/logger";
import type { RouteContext } from "./index";
import path from "path";
import fs from "fs";
import { z } from "zod";

async function getDefaultTeacherId(): Promise<number> {
  try {
    const teachers = await getStorage().getUsersByRole('teacher');
    if (teachers.length > 0) {
      return teachers[0].id;
    }
    return 2;
  } catch {
    return 2;
  }
}

export function registerScheduleRoutes(app: Express, { authenticateUser, requireRole, upload }: RouteContext) {
// Subject Routes
app.get('/api/subjects', authenticateUser, async (req, res) => {
  try {
    const subjects = await getStorage().getSubjects();
    logger.info('Retrieved subjects:', JSON.stringify(subjects, null, 2));
    res.json(subjects);
  } catch (error) {
    logger.error('Error fetching subjects:', error);
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
    if (!req.user || (req.user!.role !== 'teacher' && req.user!.role !== 'admin')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const subjects = await getStorage().getSubjectsByTeacher(req.user!.id);
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
    if (req.user!.id !== studentId && req.user!.role === 'student') {
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
        logger.info(`Subject with ID ${item.subjectId} not found, skipping schedule item`);
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
    
    logger.info(`Returning ${validSchedule.length} valid schedule items with subject and teacher info`);
    res.json(validSchedule);
  } catch (error) {
    logger.error('Error fetching schedule:', error);
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
    logger.error('Error generating CSV template:', error);
    res.status(500).send('Ошибка при генерации шаблона CSV');
  }
});

app.get('/api/schedule/student/:studentId', authenticateUser, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    
    // Students can only view their own schedule unless they're admins/teachers
    if (req.user!.id !== studentId && req.user!.role === 'student') {
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
    if (!req.user || req.user!.role !== 'student') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    logger.info(`Fetching schedule for student with ID: ${req.user!.id}`);
    const schedule = await getStorage().getScheduleItemsByStudent(req.user!.id);
    logger.info(`Found ${schedule.length} schedule items for student ${req.user!.id}`);
    
    res.json(schedule);
  } catch (error) {
    logger.error('Error fetching student schedule:', error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get('/api/schedule/teacher/:teacherId', authenticateUser, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);
    
    // Teachers can only view their own schedule unless they're admins
    if (req.user!.id !== teacherId && req.user!.role !== 'admin') {
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
    if (!req.user || (req.user!.role !== 'teacher' && req.user!.role !== 'admin')) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    logger.info(`Fetching schedule for teacher with ID: ${req.user!.id}`);
    const schedule = await getStorage().getScheduleItemsByTeacher(req.user!.id);
    logger.info(`Found ${schedule.length} schedule items for teacher ${req.user!.id}`);
    
    res.json(schedule);
  } catch (error) {
    logger.error('Error fetching teacher schedule:', error);
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
    logger.info(`Existing subjects: ${allSubjects.length}`);
    
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
          logger.info(`Found existing subject "${existingSubject.name}" with ID: ${existingSubject.id}`);
          item.subjectId = existingSubject.id;
        } else {
          // Если предмет не найден, создаем новый
          logger.info(`Creating new subject with name: "${subjectName}"`);
          
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
          
          logger.info(`Created new subject: ${JSON.stringify(newSubject)}`);
          
          // Добавляем новый предмет в массив для будущих проверок
          allSubjects.push(newSubject);
          
          // Устанавливаем ID предмета в элемент расписания
          item.subjectId = newSubject.id;
        }
      } catch (error) {
        logger.error(`Error processing subject for schedule item:`, error);
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
        originalName: req.file!.originalname,
        storedName: path.basename(req.file!.path),
        filePath: req.file!.path,
        fileSize: req.file!.size,
        mimeType: req.file!.mimetype,
        importType: 'csv',
        status: result.success > 0 ? 'success' : 'error',
        itemsCount: result.total,
        successCount: result.success,
        errorCount: result.total - result.success,
        uploadedBy: req.user!!.id
      });
      
      logger.info(`Created import file record: ${gsheetFileInfo.id}`);
      
      // Обновляем созданные элементы расписания, чтобы связать их с файлом
      for (const item of createdItems) {
        await getStorage().updateScheduleItem(item.id, {
          ...item,
          importedFileId: gsheetFileInfo.id
        });
        logger.info(`Linked schedule item ${item.id} with imported file ${gsheetFileInfo.id}`);
      }
    } catch (fileError) {
      logger.error('Error saving file import record:', fileError);
      // Не прерываем операцию, если не удалось сохранить информацию о файле
    }
    
    res.status(200).json({
      message: `Successfully imported ${result.success} out of ${result.total} schedule items.`,
      result
    });
  } catch (error: any) {
    logger.error('Error importing schedule from Google Sheets:', error);
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
      const filePath = req.file!.path;
      logger.info(`Processing uploaded CSV file at: ${filePath}`);
      
      // Проверяем и получаем информацию о CSV файле
      const csvFileInfo = {
        mime: req.file!.mimetype,
        size: req.file!.size,
        name: req.file!.originalname
      };
      
      logger.info(`CSV File Info - Type: ${csvFileInfo.mime}, Size: ${csvFileInfo.size} bytes, Name: ${csvFileInfo.name}`);
      
      // Parse the CSV file to schedule items - не передаем заголовки, чтобы функция автоматически определила их
      const { scheduleItems, errors: parseErrors } = await parseCsvToScheduleItems(filePath);
      logger.info(`Parsed CSV data: Found ${scheduleItems.length} potential schedule items with ${parseErrors.length} parse errors`);
      
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
      logger.info(`Existing subjects: ${allSubjects.length}`);
      
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
            logger.info(`Found existing subject "${existingSubject.name}" with ID: ${existingSubject.id}`);
            item.subjectId = existingSubject.id;
          } else {
            // Если предмет не найден, создаем новый
            logger.info(`Creating new subject with name: "${subjectName}"`);
            
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
            
            logger.info(`Created new subject: ${JSON.stringify(newSubject)}`);
            
            // Добавляем новый предмет в массив для будущих проверок
            allSubjects.push(newSubject);
            
            // Устанавливаем ID предмета в элемент расписания
            item.subjectId = newSubject.id;
          }
        } catch (error) {
          logger.error(`Error processing subject for schedule item:`, error);
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
          originalName: req.file!.originalname,
          storedName: path.basename(req.file!.path),
          filePath: req.file!.path,
          fileSize: req.file!.size,
          mimeType: req.file!.mimetype,
          importType: 'csv',
          status: result.success > 0 ? 'success' : 'error',
          itemsCount: result.total,
          successCount: result.success,
          errorCount: result.errors.length,
          uploadedBy: req.user!!.id
        });
        
        logger.info(`Created import file record: ${importFileInfo.id}`);
        
        // Обновляем созданные элементы расписания, чтобы связать их с файлом
        for (const item of createdItems) {
          await getStorage().updateScheduleItem(item.id, {
            ...item,
            importedFileId: importFileInfo.id
          });
          logger.info(`Linked schedule item ${item.id} with imported file ${importFileInfo.id}`);
        }
      } catch (fileError) {
        logger.error('Error saving file import record:', fileError);
        // Не прерываем операцию, если не удалось сохранить информацию о файле
      }
      
      res.status(200).json({
        message: `Successfully imported ${result.success} out of ${result.total} schedule items.`,
        result
      });
    } catch (error: any) {
      logger.error('Error importing schedule from CSV:', error);
      
      // Clean up the uploaded file if exists
      if (req.file && fs.existsSync(req.file!.path)) {
        fs.unlinkSync(req.file!.path);
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
      logger.error('Invalid file ID provided:', req.params.id);
      return res.status(400).json({ 
        error: true,
        message: "Invalid file ID", 
        details: "The file ID must be a valid number"
      });
    }
    
    logger.info(`[DELETE FILE] Processing delete request for imported file ID: ${id}`);
    
    // Step 1: Get the file details
    const file = await getStorage().getImportedFile(id);
    
    if (!file) {
      logger.info(`[DELETE FILE] File with ID ${id} not found`);
      return res.status(404).json({ 
        error: true, 
        message: "File not found",
        details: `No file with ID ${id} exists in the database`
      });
    }
    
    logger.info(`[DELETE FILE] Found file: ${file.originalName}, import type: ${file.importType}`);
    
    // Step 2: Delete the physical file if it exists
    let physicalFileDeleted = false;
    
    if (file.filePath && file.importType === 'csv') {
      const fullPath = path.join(process.cwd(), file.filePath);
      logger.info(`[DELETE FILE] Attempting to delete physical file at: ${fullPath}`);
      
      try {
        await fs.promises.access(fullPath);
        await fs.promises.unlink(fullPath);
        logger.info(`[DELETE FILE] Successfully deleted physical file: ${fullPath}`);
        physicalFileDeleted = true;
      } catch (err) {
        logger.error(`[DELETE FILE] Could not delete physical file ${fullPath}:`, err);
        // Continue with database operations even if physical file delete fails
      }
    }
    
    logger.info(`[DELETE FILE] Now checking related schedule items for file ID: ${id}`);
    
    // Step 3: Get count of related schedule items before deletion
    const { scheduleItems } = await import('@shared/schema');
    const { sql, eq } = await import('drizzle-orm');
    
    // Get count of related items
    const relatedItemsCount = await db.select({
        count: sql<number>`count(*)`,
      })
      .from(scheduleItems)
      .where(eq(scheduleItems.importedFileId, id))
      .then(result => Number(result[0]?.count || 0));
    
    logger.info(`[DELETE FILE] Found ${relatedItemsCount} schedule items related to imported file ID: ${id}`);
    
    // Step 4: Delete the database records using our improved transaction-based method
    logger.info(`[DELETE FILE] Attempting to delete file ID ${id} and related records from database`);
    const success = await getStorage().deleteImportedFile(id);
    
    // Step 5: Respond with appropriate status based on success
    if (success) {
      logger.info(`[DELETE FILE] Successfully deleted imported file with ID: ${id} and all related schedule items`);
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
      logger.error(`[DELETE FILE] Database operation failed for deleting imported file with ID: ${id}`);
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
    logger.error('[DELETE FILE] Unhandled error in delete imported file handler:', error);
    
    // Provide more helpful error messages to both logs and response
    if (error instanceof Error) {
      logger.error('[DELETE FILE] Detailed error:', {
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

}
