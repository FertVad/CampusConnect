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

// Function to parse sheet data into schedule items
export function parseSheetDataToScheduleItems(
  sheetData: any[][], 
  headers: string[] = ['subjectId', 'dayOfWeek', 'startTime', 'endTime', 'roomNumber']
): { scheduleItems: Partial<InsertScheduleItem>[], errors: ScheduleImportError[] } {
  const scheduleItems: Partial<InsertScheduleItem>[] = [];
  const errors: ScheduleImportError[] = [];

  // Skip header row
  const dataRows = sheetData.slice(1);

  dataRows.forEach((row, index) => {
    try {
      // Ensure the row has enough columns
      if (row.length < headers.length - 1) { // roomNumber is optional
        throw new Error('Row is missing required columns');
      }

      const item: Partial<InsertScheduleItem> = {};
      
      // Map columns to schedule item properties
      headers.forEach((header, colIndex) => {
        if (colIndex < row.length) {
          const value = row[colIndex];
          
          if (header === 'subjectId' || header === 'dayOfWeek') {
            // Convert to integers
            const intValue = parseInt(value, 10);
            if (isNaN(intValue)) {
              throw new Error(`Invalid ${header}: ${value}`);
            }
            if (header === 'subjectId') {
              item.subjectId = intValue;
            } else if (header === 'dayOfWeek') {
              item.dayOfWeek = intValue;
            }
          } else if (header === 'startTime' || header === 'endTime') {
            // Validate time format (HH:MM:SS or HH:MM)
            const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
            if (!timeRegex.test(value)) {
              throw new Error(`Invalid ${header} format: ${value}`);
            }
            
            // Ensure it has seconds
            let formattedTime: string;
            if (!value.includes(':')) {
              formattedTime = `${value}:00`;
            } else if (value.split(':').length === 2) {
              formattedTime = `${value}:00`;
            } else {
              formattedTime = value;
            }
            
            if (header === 'startTime') {
              item.startTime = formattedTime;
            } else if (header === 'endTime') {
              item.endTime = formattedTime;
            }
          } else if (header === 'roomNumber') {
            // For roomNumber or other string fields
            item.roomNumber = value;
          }
        }
      });

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