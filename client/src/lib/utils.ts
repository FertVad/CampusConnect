import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from 'date-fns';
import { Grade } from '@shared/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting functions
export function formatDate(date: Date | string): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}

export function formatTime(date: Date | string): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'h:mm a');
}

export function getRelativeTime(date: Date | string): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

// Day of week functions
export function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
}

// Status color helpers
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-warning text-warning-foreground';
    case 'approved':
      return 'bg-success text-success-foreground';
    case 'rejected':
      return 'bg-destructive text-destructive-foreground';
    case 'completed':
      return 'bg-success text-success-foreground';
    case 'in progress':
      return 'bg-info text-info-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// File handling helpers
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GPA calculation

export function calculateGPA(grades: Grade[]): string {
  if (!grades || grades.length === 0) return "0.00";
  
  const totalScore = grades.reduce((acc, grade) => acc + grade.score, 0);
  const totalMaxScore = grades.reduce((acc, grade) => acc + grade.maxScore, 0);
  
  if (totalMaxScore === 0) return "0.00";
  
  const gpa = (totalScore / totalMaxScore) * 4.0;
  return gpa.toFixed(2);
}