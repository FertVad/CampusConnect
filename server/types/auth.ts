export type UserRole = 'admin' | 'teacher' | 'student';

export interface AuthenticatedUser {
  id: string; // Supabase UUID
  publicId: number; // Database ID
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

import type { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
