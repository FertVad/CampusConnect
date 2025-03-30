import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options || { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(dateObject);
}

export function formatTime(time: string): string {
  // Parse time string in format "HH:MM:SS"
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);
  
  // Convert to 12-hour format
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getRelativeTime(date: Date | string): string {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObject.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  
  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateObject);
  }
}

export function calculateGPA(grades: { score: number; maxScore: number }[]): number {
  if (grades.length === 0) return 0;
  
  const totalScore = grades.reduce((acc, grade) => {
    return acc + (grade.score / grade.maxScore) * 4.0;
  }, 0);
  
  return parseFloat((totalScore / grades.length).toFixed(1));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getStatusColor(status: string): string {
  const statusColors = {
    completed: 'success',
    graded: 'success',
    not_started: 'primary',
    in_progress: 'warning',
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
  };
  
  return statusColors[status as keyof typeof statusColors] || 'primary';
}

export function isDateInPast(date: Date | string): boolean {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  return dateObject < new Date();
}
