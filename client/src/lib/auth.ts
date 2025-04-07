
// This file handles the auth header generation for API requests

/**
 * Gets the headers needed for authenticated requests
 */
export function getAuthHeaders(): HeadersInit {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
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
