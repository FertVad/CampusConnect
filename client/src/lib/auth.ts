// This file handles the auth header generation for API requests

export function getAuthHeaders(): HeadersInit {
  // No custom headers needed since we're using cookies for authentication
  return {};
}

// Function to check if a user has a specific role
export function hasRole(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

// Function to check if a user has admin privileges
export function isAdmin(userRole: string | undefined): boolean {
  return userRole === 'admin';
}

// Function to check if a user is a teacher
export function isTeacher(userRole: string | undefined): boolean {
  return userRole === 'teacher' || userRole === 'admin';
}

// Function to check if a user is a student
export function isStudent(userRole: string | undefined): boolean {
  return userRole === 'student';
}