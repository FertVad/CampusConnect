import React, { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";

// Строгие типы ролей
export type UserRole = 'admin' | 'teacher' | 'student' | 'director';

// Тип пользователя, возвращаемого эндпоинтом /api/user
export interface AuthUser {
  id: string; // UUID из auth.users
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
}
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/queryClient';
import { logger } from '@/lib/logger';

// Development only logger
// Expect at least one argument to satisfy TypeScript's tuple requirement
const devLog = (...args: [unknown, ...unknown[]]) => {
  if (import.meta.env.DEV) {
    logger.info(...args);
  }
};

// Helper to dispatch authentication status change events
const dispatchAuthStatusChanged = (isAuthenticated: boolean) => {
  try {
    // Store in localStorage for persistence across page reloads
    localStorage.setItem('isAuthenticated', isAuthenticated ? 'true' : 'false');
    
    // Dispatch custom event for WebSocket interceptor
    const event = new CustomEvent('authStatusChanged', {
      detail: { isAuthenticated }
    });
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error dispatching auth status:', error);
  }
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthUser, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
};

// Создаем значение по умолчанию для контекста с isAuthenticated
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Проверяем, есть ли в localStorage признак аутентификации
        const isAuth = localStorage.getItem('isAuthenticated') === 'true';
        if (!isAuth) {
          return null; // Не делаем запрос, если пользователь наверняка не аутентифицирован
        }
        
        const { data: sessionData } = await supabase.auth.getSession();
        // devLog('Supabase access token:', sessionData.session?.access_token);

        const fetchOptions: RequestInit = {
          method: 'GET',
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          },
          cache: 'no-store'
        };

        const token = sessionData.session?.access_token;
        if (token) {
          (fetchOptions.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }

        devLog('Fetch /api/user', {
          method: fetchOptions.method,
          url: '/api/user',
          credentials: fetchOptions.credentials,
          headers: fetchOptions.headers,
        });

        const res = await authFetch("/api/user", fetchOptions);
        
        if (res.status === 401) {
          // Если получили 401, очищаем localStorage
          localStorage.removeItem('isAuthenticated');
          return null;
        }
        
        if (!res.ok) {
          throw new Error("Failed to fetch user data");
        }
        
        const userData = await res.json();
        return userData;
      } catch (error) {
        return null;
      }
    },
    refetchOnMount: false, // Отключаем перезагрузку при каждом монтировании
    refetchOnWindowFocus: false, // Отключаем перезагрузку при фокусе окна
    refetchOnReconnect: true, // Включаем перезагрузку при восстановлении соединения
    staleTime: 30 * 60 * 1000, // Считаем данные свежими 30 минут
    gcTime: 60 * 60 * 1000, // Храним в кэше 60 минут
    retry: 0, // Не повторяем запрос при ошибке (большинство ошибок будут связаны с отсутствием аутентификации)
    refetchInterval: false // Не делаем периодические запросы
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        throw new Error(error.message);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      // devLog('Supabase access token:', sessionData.session?.access_token);

      const fetchOptions: RequestInit = {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {}
      };

      const token = sessionData.session?.access_token;
      if (token) {
        (fetchOptions.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }

      devLog('Fetch /api/user', {
        method: fetchOptions.method,
        url: '/api/user',
        credentials: fetchOptions.credentials,
        headers: fetchOptions.headers,
      });

      const res = await authFetch("/api/user", fetchOptions);
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      return await res.json();
    },
    onSuccess: async (userData: AuthUser) => {
      queryClient.setQueryData(["/api/user"], userData);
      // Explicitly set authentication status to true
      dispatchAuthStatusChanged(true);
      // invalidate notifications cache
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      // Установить Supabase сессию для Real-time
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        await supabase.auth.setSession({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        });
      }
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const { email, password } = userData;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role
          }
        }
      });
      if (error) {
        throw new Error(error.message);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      // devLog('Supabase access token:', sessionData.session?.access_token);

      const fetchOptions: RequestInit = {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {}
      };

      const token = sessionData.session?.access_token;
      if (token) {
        (fetchOptions.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }

      devLog('Fetch /api/user', {
        method: fetchOptions.method,
        url: '/api/user',
        credentials: fetchOptions.credentials,
        headers: fetchOptions.headers,
      });

      const res = await authFetch('/api/user', fetchOptions);
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      return await res.json();
    },
    onSuccess: (userData: AuthUser) => {
      queryClient.setQueryData(["/api/user"], userData);
      // Set authentication status to true for new users
      dispatchAuthStatusChanged(true);
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Сначала устанавливаем пользователя в null, чтобы избежать повторных запросов
      queryClient.setQueryData(["/api/user"], null);
      
      // Explicitly set authentication status to false
      dispatchAuthStatusChanged(false);
      
      // Затем очищаем кэш react-query
      queryClient.clear();
      
      // Обнуляем все активные запросы
      queryClient.cancelQueries();
      
      // Обнуляем историю
      window.history.pushState({}, '', '/auth');
      
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
      
      // Устанавливаем задержку перед перезагрузкой страницы для гарантии очистки состояния
      setTimeout(() => {
        window.location.href = '/auth';
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        dispatchAuthStatusChanged(true);
      } else {
        queryClient.setQueryData(["/api/user"], null);
        dispatchAuthStatusChanged(false);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Update authentication status whenever user data changes
  useEffect(() => {
    const isAuthenticated = user !== null;
    dispatchAuthStatusChanged(isAuthenticated);
  }, [user]);

  // Вычисляем значение isAuthenticated
  // Если у нас есть данные пользователя, то пользователь определенно аутентифицирован
  // Используем localStorage только для определения, нужно ли делать запрос, а не для окончательного состояния
  const isAuthenticated = user !== null;
  
  // Если пользователь не аутентифицирован, убедимся, что флаг в localStorage также сброшен
  useEffect(() => {
    if (!isAuthenticated && localStorage.getItem('isAuthenticated') === 'true') {
      localStorage.removeItem('isAuthenticated');
    }
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAuthenticated,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}