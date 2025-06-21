import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to get response text, but handle JSON parsing safely
      let text = res.statusText || 'Unknown error';

      try {
        // First try to get response as text
        text = await res.text();

        // Then try to parse as JSON if it looks like JSON
        if (text.startsWith('{') || text.startsWith('[')) {
          const jsonResponse = JSON.parse(text);
          if (jsonResponse.message) {
            text = jsonResponse.message;
          }
        }
      } catch (parseError) {
      }

      throw new Error(`${res.status}: ${text}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw if it's already an Error object
      } else {
        // Fallback for Safari and other browsers with limited error handling
        throw new Error(`${res.status}: Request failed`);
      }
    }
  }
}

import { getAuthHeaders } from "./auth";

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: HeadersInit = {
    ...getAuthHeaders(),
    ...(options.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers, credentials: 'include' });
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
): Promise<any> {
  try {
    // Убедимся, что включены все необходимые заголовки для корректной работы
    const headers: HeadersInit = { 
      ...getAuthHeaders(),
      // Дополнительные заголовки для Safari
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(data ? { "Content-Type": "application/json" } : {})
    };

    // Максимальное время ожидания для запросов - 30 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Более надежный запрос с параметрами безопасности и совместимости
    const res = await authFetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      mode: 'cors', // Для лучшей совместимости
      redirect: 'follow', // Следовать за перенаправлениями
      signal: controller.signal, // Для тайм-аута
    });

    // Очистим таймер тайм-аута
    clearTimeout(timeoutId);

    await throwIfResNotOk(res);
    
    // Пытаемся распарсить ответ как JSON и вернуть уже обработанные данные
    try {
      return await res.json();
    } catch (parseError) {
      return res;
    }
  } catch (error) {
    // Более подробное логирование ошибок
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`API request timeout (${method} ${url})`);
      throw new Error(`Request timeout: ${method} ${url}`);
    }

    console.error(`API request error (${url} ${method}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Запрос с улучшенными заголовками для кросс-браузерной совместимости
      const res = await authFetch(queryKey[0] as string, {
        method: 'GET', // Явно указываем метод
        headers: {
          ...getAuthHeaders(),
          // Дополнительные заголовки для Safari
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        mode: 'cors', // Для лучшей совместимости
        redirect: 'follow', // Следовать перенаправлениям
      });

      // Обработка ошибки авторизации
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Проверяем ответ на ошибки
      await throwIfResNotOk(res);

      // Безопасный парсинг JSON с логированием
      try {
        return await res.json();
      } catch (parseError) {
        console.error(`JSON parse error for ${queryKey[0]}:`, parseError);
        throw new Error(`Failed to parse response from ${queryKey[0]}`);
      }
    } catch (error) {
      console.error(`Query error (${queryKey[0]}):`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 0,
      cacheTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});