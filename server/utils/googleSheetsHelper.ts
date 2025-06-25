import { google, sheets_v4 } from 'googleapis';
import { InsertScheduleItem } from '@shared/schema';

// Interface for the import result summary
export interface ScheduleImportResult {
  total: number;
  success: number;
  failed: number;
  errors: ScheduleImportError[];
}

// Interface for import errors
export interface ScheduleImportError {
  row: number;
  error: string;
}

// Function to authenticate with Google Sheets API
export async function authenticateWithGoogleSheets(credentials: any) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  return google.sheets({
    version: 'v4',
    auth: client as any
  });
}

// Function to fetch data from a Google Sheet
export async function fetchSheetData(sheets: sheets_v4.Sheets, spreadsheetId: string, range: string): Promise<any[][]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    throw new Error('Failed to fetch data from Google Sheets');
  }
}

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

// Function to parse sheet data into schedule items
export function parseSheetDataToScheduleItems(
  sheetData: any[][], 
  headers: string[] = ['Курс', 'Специальность', 'Группа', 'День', 'Время начала', 'Время конца', 'Предмет', 'Преподаватель', 'Кабинет']
): { scheduleItems: Partial<InsertScheduleItem>[], errors: ScheduleImportError[] } {
  const scheduleItems: Partial<InsertScheduleItem>[] = [];
  const errors: ScheduleImportError[] = [];

  // Skip header row
  const dataRows = sheetData.slice(1);

  dataRows.forEach((row, index) => {
    try {
      // Ensure the row has enough columns
      if (row.length < headers.length - 1) { // Кабинет is optional
        throw new Error('В строке отсутствуют необходимые колонки');
      }

      const item: Partial<InsertScheduleItem> = {};
      
      // Создаем объект с данными из строки
      const rowData: Record<string, string> = {};
      headers.forEach((header, colIndex) => {
        if (colIndex < row.length) {
          rowData[header] = row[colIndex];
        }
      });

      // Проверяем наличие всех обязательных полей
      if (!rowData['Курс']) {
        throw new Error('Отсутствует обязательное поле: Курс');
      }
      
      if (!rowData['Специальность']) {
        throw new Error('Отсутствует обязательное поле: Специальность');
      }
      
      if (!rowData['Группа']) {
        throw new Error('Отсутствует обязательное поле: Группа');
      }
      
      if (!rowData['Предмет']) {
        throw new Error('Отсутствует обязательное поле: Предмет');
      }
      
      if (!rowData['Преподаватель']) {
        throw new Error('Отсутствует обязательное поле: Преподаватель');
      }
      
      // Обрабатываем день недели
      const dayName = rowData['День'];
      if (!dayName) {
        throw new Error('Отсутствует обязательное поле: День');
      }
      
      const dayNumber = getDayOfWeekNumber(dayName);
      if (dayNumber === -1) {
        throw new Error(`Неверный формат дня недели: ${dayName}`);
      }
      
      item.dayOfWeek = dayNumber;
      
      // Обрабатываем время начала
      const startTime = rowData['Время начала'];
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
      const endTime = rowData['Время конца'];
      if (!endTime) {
        throw new Error('Отсутствует обязательное поле: Время конца');
      }
      
      if (!timeRegex.test(endTime)) {
        throw new Error(`Неверный формат времени окончания: ${endTime}`);
      }
      
      item.endTime = endTime;
      
      // Обрабатываем поле Кабинет (необязательное)
      const room = rowData['Кабинет'];
      if (room) {
        item.roomNumber = room;
      }
      
      // Динамическое назначение ID предмета на основе имени предмета
      // Для реального приложения нужно добавить поиск по базе данных
      // Используем ту же логику, что и в csvHelper.ts для консистентности
      const subjectName = rowData['Предмет'];
      const getSubjectId = (name: string): string => {
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return String((hash % 100) + 1); // От 1 до 100, чтобы избежать ID = 0
      };

      item.subjectId = getSubjectId(subjectName);

      scheduleItems.push(item);
    } catch (error: any) {
      errors.push({
        row: index + 2, // +2 because we're skipping header row and 0-indexing
        error: error.message || 'Unknown error',
      });
    }
  });

  return { scheduleItems, errors };
}