import React, { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
    console.log(`Auth status changed: ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`);
  } catch (error) {
    console.error('Error dispatching auth status:', error);
  }
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
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
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Проверяем, есть ли в localStorage признак аутентификации
        const isAuth = localStorage.getItem('isAuthenticated') === 'true';
        if (!isAuth) {
          return null; // Не делаем запрос, если пользователь наверняка не аутентифицирован
        }
        
        const res = await fetch("/api/user", {
          method: 'GET',
          credentials: "include", // Include cookies with the request
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest", // Helps with CSRF protection
            "Cache-Control": "no-cache, no-store, must-revalidate", 
            "Pragma": "no-cache",
            "Expires": "0"
          },
          cache: 'no-store' // Для современных браузеров - не кэшировать
        });
        
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
      console.log("Logging in with:", credentials);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest", // Helps with CSRF protection
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Include cookies with the request
        cache: 'no-store'
      });
      
      if (!res.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }
      
      // Return user data
      let userData = null;
      try {
        userData = await res.json();
        console.log("Login successful, received user data:", userData);
      } catch (e) {
        console.error("Error parsing login response:", e);
        throw new Error("Invalid response from server");
      }
      return userData;
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/user"], userData);
      // Explicitly set authentication status to true
      dispatchAuthStatusChanged(true);
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
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest", // Helps with CSRF protection
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        body: JSON.stringify(userData),
        credentials: "include", // Include cookies with the request
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      return await res.json();
    },
    onSuccess: (userData: User) => {
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
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest", // Helps with CSRF protection
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        credentials: "include", // Include cookies with the request
        cache: 'no-store'
      });
      
      if (!res.ok) {
        let errorMessage = "Logout failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
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

  // Update authentication status whenever user data changes
  useEffect(() => {
    const isAuthenticated = user !== null;
    console.log('Auth useEffect - User state changed:', { 
      user, 
      isAuthenticated, 
      userId: user?.id,
      userEmail: user?.email
    });
    dispatchAuthStatusChanged(isAuthenticated);
  }, [user]);

  // Вычисляем значение isAuthenticated
  // Если у нас есть данные пользователя, то пользователь определенно аутентифицирован
  // Используем localStorage только для определения, нужно ли делать запрос, а не для окончательного состояния
  const isAuthenticated = user !== null;
  
  // Добавляем дополнительный лог для отслеживания возвращаемого статуса аутентификации
  console.log('Auth context final state:', { 
    isAuthenticatedByUser: user !== null,
    isAuthenticatedFromStorage: localStorage.getItem('isAuthenticated') === 'true',
    combinedAuthStatus: isAuthenticated, 
    userPresent: user !== null, 
    user
  });
  
  // Если пользователь не аутентифицирован, убедимся, что флаг в localStorage также сброшен
  useEffect(() => {
    if (!isAuthenticated && localStorage.getItem('isAuthenticated') === 'true') {
      console.log('Clearing localStorage authentication flag because user is not authenticated');
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