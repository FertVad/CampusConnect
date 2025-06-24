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
