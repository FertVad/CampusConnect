export type UserRole = 'admin' | 'teacher' | 'student' | 'director';

export interface AuthenticatedUser {
  id: string; // Supabase UUID
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

import type { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const taskPermissions = {
  create: ['admin', 'director'] as UserRole[],
  update: ['admin', 'teacher', 'student', 'director'] as UserRole[],
  delete: ['admin'] as UserRole[],
  view: ['admin'] as UserRole[],
};
