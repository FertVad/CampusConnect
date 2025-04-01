import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import { InsertScheduleItem } from '@shared/schema';
import { ScheduleImportError, ScheduleImportResult } from './googleSheetsHelper';

// Function to parse CSV file to schedule items
export async function parseCsvToScheduleItems(
  filePath: string,
  headers: string[] = ['subjectId', 'dayOfWeek', 'startTime', 'endTime', 'roomNumber']
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

          // Map CSV columns to schedule item properties
          headers.forEach((header) => {
            const value = row[header];
            
            if (!value && (header !== 'roomNumber')) {
              throw new Error(`Missing required field: ${header}`);
            }

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
            } else if (header === 'roomNumber' && value) {
              // For roomNumber or other string fields
              item.roomNumber = value;
            }
          });

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