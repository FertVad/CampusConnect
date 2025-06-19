import { createReadStream, readFileSync } from 'fs';
import csvParser from 'csv-parser';
import { InsertScheduleItem } from '@shared/schema';
import { ScheduleImportError, ScheduleImportResult } from './googleSheetsHelper';
import * as chardet from 'chardet';
import fs from 'fs';
import iconv from 'iconv-lite';
import { logger } from './logger';

// Функция для нормализации и очистки значений строк
function normalizeValue(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  
  // Удаляем кавычки вокруг значения
  let normalized = value.trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || 
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.substring(1, normalized.length - 1).trim();
  }
  
  return normalized === '' ? undefined : normalized;
}

// Функция для преобразования названия дня недели в числовое значение
function getDayOfWeekNumber(day: string): number {
  const russianDaysMap: Record<string, number> = {
    'воскресенье': 0,
    'вс': 0,
    'понедельник': 1,
    'пн': 1,
    'вторник': 2,
    'вт': 2,
    'среда': 3,
    'ср': 3,
    'четверг': 4,
    'чт': 4,
    'пятница': 5,
    'пт': 5,
    'суббота': 6,
    'сб': 6
  };
  
  const englishDaysMap: Record<string, number> = {
    'sunday': 0,
    'sun': 0,
    'monday': 1,
    'mon': 1,
    'tuesday': 2,
    'tue': 2,
    'wednesday': 3,
    'wed': 3,
    'thursday': 4,
    'thu': 4,
    'friday': 5,
    'fri': 5,
    'saturday': 6,
    'sat': 6
  };
  
  const normalizedDay = day.toLowerCase().trim();
  
  return russianDaysMap[normalizedDay] ?? englishDaysMap[normalizedDay] ?? -1;
}

// Определение разделителя CSV файла
function detectDelimiter(filePath: string): string {
  try {
    // Читаем первые несколько строк файла для определения разделителя
    const encoding = chardet.detectFileSync(filePath) || 'utf8';
    const buffer = readFileSync(filePath);
    const content = iconv.decode(buffer, encoding.toString());
    
    const firstLines = content.split('\n').slice(0, 3).join('\n');
    
    // Считаем количество разных разделителей
    const commaCount = (firstLines.match(/,/g) || []).length;
    const semicolonCount = (firstLines.match(/;/g) || []).length;
    const tabCount = (firstLines.match(/\t/g) || []).length;
    
    // Выбираем разделитель с наибольшим количеством вхождений
    if (semicolonCount > commaCount && semicolonCount > tabCount) {
      logger.info('Detected CSV delimiter: semicolon (;)');
      return ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
      logger.info('Detected CSV delimiter: tab (\\t)');
      return '\t';
    } else {
      logger.info('Detected CSV delimiter: comma (,)');
      return ',';
    }
  } catch (error) {
    console.error('Error detecting CSV delimiter:', error);
    logger.info('Defaulting to comma (,) delimiter');
    return ',';
  }
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
    
    try {
      // Определяем разделитель CSV файла
      const delimiter = detectDelimiter(filePath);
  
      // Определяем кодировку файла
      const encoding = chardet.detectFileSync(filePath) || 'utf8';
      logger.info(`Detected file encoding: ${encoding}`);
      
      // Читаем и декодируем весь файл, затем преобразуем в строки для обработки
      const buffer = fs.readFileSync(filePath);
      const content = iconv.decode(buffer, encoding.toString());
      
      // Сохраняем обработанный файл в промежуточный файл в UTF-8
      const tempFilePath = `${filePath}.utf8.csv`;
      fs.writeFileSync(tempFilePath, content, 'utf8');
      
      // Создаем поток для чтения файла из промежуточного файла
      let fileStream = createReadStream(tempFilePath);
      
      // Подготавливаем опции для парсера CSV
      const parserOptions = {
        separator: delimiter,
        skipLines: 0,
        headers: headers || undefined, // Используем переданные заголовки или автоопределяем
        strict: false
      };
      
      // Обрабатываем CSV файл
      fileStream
        .pipe(csvParser(parserOptions))
        .on('headers', (headers) => {
          foundHeaders = headers.map((h: string) => h.trim());
          logger.info(`Found CSV headers: ${foundHeaders.join(', ')}`);
        })
      .on('data', (row) => {
        rowIndex++;
        try {
          const item: Partial<InsertScheduleItem> = {};
          
          // Нормализуем все значения
          const normalizedRow: Record<string, string | undefined> = {};
          for (const key in row) {
            normalizedRow[key.trim()] = normalizeValue(row[key]);
          }
          
          logger.info('Row data:', normalizedRow);
          
          // Попробуем определить формат CSV файла по заголовкам
          let subjectName, dayName, startTime, endTime, roomNumber, teacherName;
          
          // Дополнительные поля, которые мы будем игнорировать (но логировать)
          let course, specialty, group;
          
          // Логируем все найденные заголовки
          logger.info('Found column headers:', Object.keys(normalizedRow));
          
          // Сначала ищем стандартные названия полей - точные совпадения
          if (normalizedRow['Subject'] !== undefined) subjectName = normalizedRow['Subject'];
          else if (normalizedRow['Предмет'] !== undefined) subjectName = normalizedRow['Предмет'];
          
          if (normalizedRow['Day'] !== undefined) dayName = normalizedRow['Day'];
          else if (normalizedRow['День'] !== undefined) dayName = normalizedRow['День'];
          
          if (normalizedRow['Start Time'] !== undefined) startTime = normalizedRow['Start Time'];
          else if (normalizedRow['Время начала'] !== undefined) startTime = normalizedRow['Время начала']; 
          
          if (normalizedRow['End Time'] !== undefined) endTime = normalizedRow['End Time'];
          else if (normalizedRow['Время конца'] !== undefined) endTime = normalizedRow['Время конца'];
          
          if (normalizedRow['Room'] !== undefined) roomNumber = normalizedRow['Room'];
          else if (normalizedRow['Кабинет'] !== undefined) roomNumber = normalizedRow['Кабинет'];
          
          if (normalizedRow['Teacher'] !== undefined) teacherName = normalizedRow['Teacher'];
          else if (normalizedRow['Преподаватель'] !== undefined) teacherName = normalizedRow['Преподаватель'];
          
          // Учитываем дополнительные поля
          if (normalizedRow['Курс'] !== undefined) course = normalizedRow['Курс'];
          if (normalizedRow['Специальность'] !== undefined) specialty = normalizedRow['Специальность'];
          if (normalizedRow['Группа'] !== undefined) group = normalizedRow['Группа'];
          
          // Логируем дополнительные поля, если они найдены
          if (course || specialty || group) {
            logger.info(`Additional fields found - Course: ${course}, Specialty: ${specialty}, Group: ${group}`);
          }
          
          // Если не нашли точные совпадения, ищем по содержимому заголовков
          if (!subjectName) {
            const subjectHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('subject') || 
              h.toLowerCase().includes('предмет') ||
              h.toLowerCase().includes('дисциплина'));
            if (subjectHeader) {
              logger.info(`Found subject column through partial match: ${subjectHeader}`);
              subjectName = normalizedRow[subjectHeader];
            }
          }
          
          if (!dayName) {
            const dayHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('day') || 
              h.toLowerCase().includes('день') ||
              h.toLowerCase().includes('дата'));
            if (dayHeader) {
              logger.info(`Found day column through partial match: ${dayHeader}`);
              dayName = normalizedRow[dayHeader];
            }
          }
          
          if (!startTime) {
            const startHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('start') || 
              h.toLowerCase().includes('начало') || 
              h.toLowerCase().includes('начала') ||
              h.toLowerCase().includes('с'));
            if (startHeader) {
              logger.info(`Found start time column through partial match: ${startHeader}`);
              startTime = normalizedRow[startHeader];
            }
          }
          
          if (!endTime) {
            const endHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('end') || 
              h.toLowerCase().includes('конец') || 
              h.toLowerCase().includes('конца') ||
              h.toLowerCase().includes('завершение') ||
              h.toLowerCase().includes('до'));
            if (endHeader) {
              logger.info(`Found end time column through partial match: ${endHeader}`);
              endTime = normalizedRow[endHeader];
            }
          }
          
          if (!roomNumber) {
            const roomHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('room') || 
              h.toLowerCase().includes('кабинет') || 
              h.toLowerCase().includes('аудитория') ||
              h.toLowerCase().includes('класс'));
            if (roomHeader) {
              logger.info(`Found room column through partial match: ${roomHeader}`);
              roomNumber = normalizedRow[roomHeader];
            }
          }
          
          if (!teacherName) {
            const teacherHeader = foundHeaders.find(h => 
              h.toLowerCase().includes('teacher') || 
              h.toLowerCase().includes('преподаватель') || 
              h.toLowerCase().includes('учитель') ||
              h.toLowerCase().includes('педагог'));
            if (teacherHeader) {
              logger.info(`Found teacher column through partial match: ${teacherHeader}`);
              teacherName = normalizedRow[teacherHeader];
            }
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
            // Проверяем числовое представление дня недели (0-6)
            const numericDay = parseInt(dayName);
            if (!isNaN(numericDay) && numericDay >= 0 && numericDay <= 6) {
              item.dayOfWeek = numericDay;
            } else {
              throw new Error(`Неверный формат дня недели: ${dayName}`);
            }
          } else {
            item.dayOfWeek = dayNumber;
          }
          
          // Обрабатываем время начала
          // Валидация формата времени (ЧЧ:ММ или чч.мм)
          const timeRegexColon = /^(\d{1,2}):(\d{2})$/;
          const timeRegexDot = /^(\d{1,2})\.(\d{2})$/;
          const timeRegexNumeric = /^(\d{1,2})(\d{2})$/;
          
          // Функция для форматирования времени в формат ЧЧ:ММ
          const formatTimeToHHMM = (time: string): string => {
            if (timeRegexColon.test(time)) {
              return time; // Уже в нужном формате ЧЧ:ММ
            } else if (timeRegexDot.test(time)) {
              return time.replace('.', ':'); // Заменяем точку на двоеточие
            } else if (timeRegexNumeric.test(time)) {
              // Преобразуем формат ЧЧММ в ЧЧ:ММ
              const hour = time.substring(0, time.length - 2);
              const minute = time.substring(time.length - 2);
              return `${hour}:${minute}`;
            }
            return time; // Возвращаем как есть, если не подходит под известные форматы
          };
          
          // Приводим время к нужному формату
          const formattedStartTime = formatTimeToHHMM(startTime);
          const formattedEndTime = formatTimeToHHMM(endTime);
          
          // Проверяем форматы времени после преобразования
          if (!timeRegexColon.test(formattedStartTime)) {
            throw new Error(`Неверный формат времени начала: ${startTime}. Ожидается формат ЧЧ:ММ`);
          }
          
          if (!timeRegexColon.test(formattedEndTime)) {
            throw new Error(`Неверный формат времени окончания: ${endTime}. Ожидается формат ЧЧ:ММ`);
          }
          
          item.startTime = formattedStartTime;
          item.endTime = formattedEndTime;
          
          // Обрабатываем поле Кабинет (необязательное)
          if (roomNumber) {
            item.roomNumber = roomNumber.trim();
          }
          
          // Сохраняем имя предмета
          (item as any).subjectName = subjectName.trim();
          
          // Сохраняем имя преподавателя, если оно есть
          if (teacherName) {
            item.teacherName = teacherName.trim();
          }
          
          logger.info(`Extracted schedule item: ${JSON.stringify(item)}`);
          logger.info(`CSV Row: Day=${dayName}, Subject=${subjectName}, Start=${startTime}, End=${endTime}, Teacher=${teacherName || 'Not specified'}, Room=${roomNumber || 'Not specified'}`);

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
    } catch (error: any) {
      console.error('Error processing CSV file:', error);
      reject(error);
    }
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