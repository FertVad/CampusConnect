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
          
          // Проверяем наличие всех обязательных полей
          const course = row['Курс'];
          const specialty = row['Специальность'];
          const group = row['Группа'];
          const subjectName = row['Предмет'];
          const teacher = row['Преподаватель'];
          
          if (!course) {
            throw new Error('Отсутствует обязательное поле: Курс');
          }
          
          if (!specialty) {
            throw new Error('Отсутствует обязательное поле: Специальность');
          }
          
          if (!group) {
            throw new Error('Отсутствует обязательное поле: Группа');
          }
          
          if (!subjectName) {
            throw new Error('Отсутствует обязательное поле: Предмет');
          }
          
          if (!teacher) {
            throw new Error('Отсутствует обязательное поле: Преподаватель');
          }
          
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
          
          // Вместо генерации ID на основе хеша имени предмета
          // сохраняем название предмета в специальное поле. 
          // Фактический ID предмета будет заполнен позже в процессе импорта
          // при обработке маршрута в routes.ts
          
          // Добавляем имя предмета в дополнительное свойство
          (item as any).subjectName = subjectName.trim();
          
          console.log(`Extracted schedule item: ${JSON.stringify(item)}`);
          console.log(`CSV Row: Course=${course}, Specialty=${specialty}, Group=${group}, Day=${dayName}, Subject=${subjectName}, Teacher=${teacher}`);
          

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