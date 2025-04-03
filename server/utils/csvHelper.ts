import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import { InsertScheduleItem } from '@shared/schema';
import { ScheduleImportError, ScheduleImportResult } from './googleSheetsHelper';

// Функция для преобразования названия дня недели в числовое значение
function getDayOfWeekNumber(day: string): number {
  const daysMap: Record<string, number> = {
    'воскресенье': 0,
    'понедельник': 1,
    'вторник': 2,
    'среда': 3,
    'четверг': 4,
    'пятница': 5,
    'суббота': 6
  };
  
  return daysMap[day.toLowerCase()] ?? -1;
}

// Функция для обработки данных из CSV файла в формате расписания
export async function parseCsvToScheduleItems(
  filePath: string,
  headers?: string[] // Принимаем любые заголовки
): Promise<{ scheduleItems: Partial<InsertScheduleItem>[], errors: ScheduleImportError[] }> {
  return new Promise((resolve, reject) => {
    const scheduleItems: Partial<InsertScheduleItem>[] = [];
    const errors: ScheduleImportError[] = [];
    let rowIndex = 1; // Start at 1 for header row
    let foundHeaders: string[] = [];

    createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headers) => {
        foundHeaders = headers;
        console.log(`Found CSV headers: ${headers.join(', ')}`);
      })
      .on('data', (row) => {
        rowIndex++;
        try {
          const item: Partial<InsertScheduleItem> = {};
          
          // Попробуем определить формат CSV файла по заголовкам
          let subjectName, dayName, startTime, endTime, roomNumber, teacherName;
          
          // Сначала ищем стандартные названия полей - точные совпадения
          if (row['Subject'] !== undefined) subjectName = row['Subject'];
          else if (row['Предмет'] !== undefined) subjectName = row['Предмет'];
          
          if (row['Day'] !== undefined) dayName = row['Day'];
          else if (row['День'] !== undefined) dayName = row['День'];
          
          if (row['Start Time'] !== undefined) startTime = row['Start Time'];
          else if (row['Время начала'] !== undefined) startTime = row['Время начала']; 
          
          if (row['End Time'] !== undefined) endTime = row['End Time'];
          else if (row['Время конца'] !== undefined) endTime = row['Время конца'];
          
          if (row['Room'] !== undefined) roomNumber = row['Room'];
          else if (row['Кабинет'] !== undefined) roomNumber = row['Кабинет'];
          
          if (row['Teacher'] !== undefined) teacherName = row['Teacher'];
          else if (row['Преподаватель'] !== undefined) teacherName = row['Преподаватель'];
          
          // Если не нашли точные совпадения, ищем по содержимому заголовков
          if (!subjectName) {
            const subjectHeader = foundHeaders.find(h => h.toLowerCase().includes('subject') || h.toLowerCase().includes('предмет'));
            if (subjectHeader) subjectName = row[subjectHeader];
          }
          
          if (!dayName) {
            const dayHeader = foundHeaders.find(h => h.toLowerCase().includes('day') || h.toLowerCase().includes('день'));
            if (dayHeader) dayName = row[dayHeader];
          }
          
          if (!startTime) {
            const startHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('start') || 
              h.toLowerCase().includes('начало') || 
              h.toLowerCase().includes('начала'));
            if (startHeader) startTime = row[startHeader];
          }
          
          if (!endTime) {
            const endHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('end') || 
              h.toLowerCase().includes('конец') || 
              h.toLowerCase().includes('конца'));
            if (endHeader) endTime = row[endHeader];
          }
          
          if (!roomNumber) {
            const roomHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('room') || 
              h.toLowerCase().includes('кабинет') || 
              h.toLowerCase().includes('аудитория'));
            if (roomHeader) roomNumber = row[roomHeader];
          }
          
          if (!teacherName) {
            const teacherHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('teacher') || 
              h.toLowerCase().includes('преподаватель') || 
              h.toLowerCase().includes('учитель'));
            if (teacherHeader) teacherName = row[teacherHeader];
          }
          
          // Проверяем обязательные поля
          if (!subjectName) {
            throw new Error('Отсутствует обязательное поле: Предмет (Subject)');
          }
          
          if (!dayName) {
            throw new Error('Отсутствует обязательное поле: День (Day)');
          }
          
          if (!startTime) {
            throw new Error('Отсутствует обязательное поле: Время начала (Start Time)');
          }
          
          if (!endTime) {
            throw new Error('Отсутствует обязательное поле: Время конца (End Time)');
          }
          
          // Обрабатываем день недели
          const dayNumber = getDayOfWeekNumber(dayName);
          if (dayNumber === -1) {
            // Если английское название дня, пробуем их тоже распознать
            const englishDaysMap: Record<string, number> = {
              'sunday': 0,
              'monday': 1,
              'tuesday': 2,
              'wednesday': 3,
              'thursday': 4,
              'friday': 5,
              'saturday': 6
            };
            
            const englishDayNumber = englishDaysMap[dayName.toLowerCase()];
            if (englishDayNumber === undefined) {
              throw new Error(`Неверный формат дня недели: ${dayName}`);
            }
            
            item.dayOfWeek = englishDayNumber;
          } else {
            item.dayOfWeek = dayNumber;
          }
          
          // Обрабатываем время начала
          // Валидация формата времени (ЧЧ:ММ)
          const timeRegex = /^(\d{1,2}):(\d{2})$/;
          if (!timeRegex.test(startTime)) {
            throw new Error(`Неверный формат времени начала: ${startTime}. Ожидается формат ЧЧ:ММ`);
          }
          
          item.startTime = startTime;
          
          // Обрабатываем время окончания
          if (!timeRegex.test(endTime)) {
            throw new Error(`Неверный формат времени окончания: ${endTime}. Ожидается формат ЧЧ:ММ`);
          }
          
          item.endTime = endTime;
          
          // Обрабатываем поле Кабинет (необязательное)
          if (roomNumber) {
            item.roomNumber = roomNumber;
          }
          
          // Сохраняем имя предмета
          (item as any).subjectName = subjectName.trim();
          
          // Сохраняем имя преподавателя, если оно есть
          if (teacherName) {
            item.teacherName = teacherName.trim();
          }
          
          console.log(`Extracted schedule item: ${JSON.stringify(item)}`);
          console.log(`CSV Row: Day=${dayName}, Subject=${subjectName}, Start=${startTime}, End=${endTime}, Teacher=${teacherName || 'Not specified'}, Room=${roomNumber || 'Not specified'}`);

          scheduleItems.push(item);
        } catch (error: any) {
          errors.push({
            row: rowIndex,
            error: error.message || 'Unknown error',
          });
        }
      })
      .on('end', () => {
        resolve({ scheduleItems, errors });
      })
      .on('error', (error: any) => {
        reject(error);
      });
  });
}

// Функция валидации элементов расписания
export async function validateScheduleItems(
  scheduleItems: Partial<InsertScheduleItem>[],
  validateSubject: (subjectId: number) => Promise<boolean>
): Promise<{ validItems: InsertScheduleItem[], errors: ScheduleImportError[] }> {
  const validItems: InsertScheduleItem[] = [];
  const errors: ScheduleImportError[] = [];

  let rowIndex = 0;
  for (const item of scheduleItems) {
    rowIndex++;
    try {
      // Validate required fields exist, except subjectId which may be added later
      if (item.dayOfWeek === undefined || !item.startTime || !item.endTime) {
        throw new Error('Отсутствуют обязательные поля (день недели, время начала или время окончания)');
      }

      // Validate day of week is between 0-6 (Sunday-Saturday)
      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new Error(`Неверный день недели: ${item.dayOfWeek}. Должен быть от 0 (Воскресенье) до 6 (Суббота)`);
      }

      // Validate that the subject exists only if subjectId is defined
      // Если ID предмета указан и требует проверки
      if (item.subjectId !== undefined) {
        const subjectExists = await validateSubject(item.subjectId);
        if (!subjectExists) {
          throw new Error(`Предмет с ID ${item.subjectId} не существует`);
        }
      } else if (!(item as any).subjectName) {
        // Если нет ни ID предмета, ни имени предмета - ошибка
        throw new Error('Отсутствует информация о предмете');
      }

      // If we get here, the item is valid for insertion
      // Убедимся, что все необходимые поля заполнены или будут заполнены позже
      validItems.push(item as InsertScheduleItem);
    } catch (error: any) {
      errors.push({
        row: rowIndex,
        error: error.message || 'Неизвестная ошибка',
      });
    }
  }

  return { validItems, errors };
}

// Function to prepare import result
export function prepareImportResult(
  total: number,
  validItems: InsertScheduleItem[],
  errors: ScheduleImportError[]
): ScheduleImportResult {
  return {
    total,
    success: validItems.length,
    failed: errors.length,
    errors,
  };
}