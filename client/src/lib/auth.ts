import { LoginCredentials, User } from "@shared/schema";

export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Login failed');
  }
  
  const data = await response.json();
  
  if (data.user) {
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  } else {
    throw new Error('Login failed');
  }
}

export function logout(): void {
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getCurrentUser(): User | null {
  const userString = localStorage.getItem('user');
  if (!userString) return null;
  
  try {
    return JSON.parse(userString) as User;
  } catch (error) {
    console.error('Error parsing user data from localStorage', error);
    localStorage.removeItem('user');
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function hasRole(role: string | string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  
  return user.role === role;
}

export function getAuthHeaders(): HeadersInit {
  const user = getCurrentUser();
  if (!user) return {};
  
  return {
    'user-id': user.id.toString(),
  };
}
