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
  headers: string[] = ['Курс', 'Специальность', 'Группа', 'День', 'Время начала', 'Время конца', 'Предмет', 'Преподаватель', 'Кабинет']
): Promise<{ scheduleItems: Partial<InsertScheduleItem>[], errors: ScheduleImportError[] }> {
  return new Promise((resolve, reject) => {
    const scheduleItems: Partial<InsertScheduleItem>[] = [];
    const errors: ScheduleImportError[] = [];
    let rowIndex = 1; // Start at 1 for header row

    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        rowIndex++;
        try {
          const item: Partial<InsertScheduleItem> = {};
          
          // Обрабатываем день недели
          const dayName = row['День'];
          if (!dayName) {
            throw new Error('Отсутствует обязательное поле: День');
          }
          
          const dayNumber = getDayOfWeekNumber(dayName);
          if (dayNumber === -1) {
            throw new Error(`Неверный формат дня недели: ${dayName}`);
          }
          
          item.dayOfWeek = dayNumber;
          
          // Обрабатываем время начала
          const startTime = row['Время начала'];
          if (!startTime) {
            throw new Error('Отсутствует обязательное поле: Время начала');
          }
          
          // Валидация формата времени (ЧЧ:ММ)
          const timeRegex = /^(\d{1,2}):(\d{2})$/;
          if (!timeRegex.test(startTime)) {
            throw new Error(`Неверный формат времени начала: ${startTime}`);
          }
          
          item.startTime = startTime;
          
          // Обрабатываем время окончания
          const endTime = row['Время конца'];
          if (!endTime) {
            throw new Error('Отсутствует обязательное поле: Время конца');
          }
          
          if (!timeRegex.test(endTime)) {
            throw new Error(`Неверный формат времени окончания: ${endTime}`);
          }
          
          item.endTime = endTime;
          
          // Обрабатываем поле Кабинет (необязательное)
          const room = row['Кабинет'];
          if (room) {
            item.roomNumber = room;
          }
          
          // TODO: Здесь будет логика обработки курса, специальности, группы и предмета
          // Которая создает/получает ID соответствующих записей
          
          // Пока просто устанавливаем временный ID предмета
          item.subjectId = 1; // Заглушка - в будущем нужно будет заменить реальным ID

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

// Function to validate schedule items against existing data
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
      // Validate all required fields exist
      if (!item.subjectId || !item.dayOfWeek || !item.startTime || !item.endTime) {
        throw new Error('Missing required fields');
      }

      // Validate day of week is between 0-6 (Sunday-Saturday)
      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new Error(`Invalid day of week: ${item.dayOfWeek}. Must be between 0 (Sunday) and 6 (Saturday)`);
      }

      // Validate that the subject exists
      const subjectExists = await validateSubject(item.subjectId);
      if (!subjectExists) {
        throw new Error(`Subject with ID ${item.subjectId} does not exist`);
      }

      // If we get here, the item is valid
      validItems.push(item as InsertScheduleItem);
    } catch (error: any) {
      errors.push({
        row: rowIndex,
        error: error.message || 'Unknown error',
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