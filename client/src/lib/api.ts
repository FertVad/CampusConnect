import { apiRequest, authFetch } from "./queryClient";
import { getAuthHeaders } from "./auth";

// Generic fetch function for GET requests with improved Safari compatibility
export async function fetchData<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  // Тайм-аут для запросов - 30 секунд
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const fetchSignal = signal ? (() => {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort());
    return controller.signal;
  })() : controller.signal;
  
  try {
    const response = await authFetch(endpoint, {
      method: 'GET', // Явно указываем метод
      headers: {
        ...getAuthHeaders(),
        // Дополнительные заголовки для Safari
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      mode: 'cors', // Для лучшей совместимости
      redirect: 'follow', // Следуем за перенаправлениями
      signal: fetchSignal // Для тайм-аута или отмены
    });
    
    // Очистим таймер
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Error fetching data from ${endpoint}: ${response.status} ${response.statusText}`);
      throw new Error(`Error fetching data from ${endpoint}: ${response.statusText}`);
    }
    
    // Безопасное получение JSON
    try {
      return await response.json() as T;
    } catch (parseError) {
      console.error(`Failed to parse JSON from ${endpoint}:`, parseError);
      throw new Error(`Failed to parse response from ${endpoint}`);
    }
  } catch (error) {
    // Проверяем на ошибку тайм-аута
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Request timeout for ${endpoint}`);
      throw new Error(`Request timeout: ${endpoint}`);
    }
    
    // Очищаем таймер в случае других ошибок
    clearTimeout(timeoutId);
    throw error;
  }
}

// Generic post function
export async function postData<T>(endpoint: string, data: any, signal?: AbortSignal): Promise<T> {
  return await apiRequest(endpoint, 'POST', data, signal) as T;
}

// Generic put function
export async function putData<T>(endpoint: string, data: any, signal?: AbortSignal): Promise<T> {
  return await apiRequest(endpoint, 'PUT', data, signal) as T;
}

// Generic delete function
export async function deleteData(endpoint: string, signal?: AbortSignal): Promise<void> {
  await apiRequest(endpoint, 'DELETE', undefined, signal);
}

// Upload file with form data - improved Safari compatibility
export async function uploadFile(endpoint: string, formData: FormData, signal?: AbortSignal): Promise<any> {
  // Тайм-аут для запросов - 60 секунд для больших файлов
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  const fetchSignal = signal ? (() => {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort());
    return controller.signal;
  })() : controller.signal;
  
  try {
    // Получаем заголовки авторизации
    const headers = getAuthHeaders();
    // Создаем новый объект заголовков без Content-Type
    const formHeaders: HeadersInit = {
      ...headers
    };
    // Удаляем Content-Type для корректной работы формы с файлами
    // NOTE: Content-Type должен быть установлен браузером для multipart/form-data
    if ('Content-Type' in formHeaders) {
      delete formHeaders['Content-Type'];
    }
    
    const response = await authFetch(endpoint, {
      method: 'POST',
      headers: {
        ...formHeaders,
        // Safari-friendly headers
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      body: formData,
      mode: 'cors',
      redirect: 'follow',
      signal: fetchSignal // Для тайм-аута
    });
    
    // Очистим таймер
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Error uploading file to ${endpoint}: ${response.status} ${response.statusText}`);
      throw new Error(`Error uploading file to ${endpoint}: ${response.statusText}`);
    }
    
    try {
      return await response.json();
    } catch (parseError) {
      console.error(`Failed to parse JSON from ${endpoint}:`, parseError);
      throw new Error(`Failed to parse response from ${endpoint}`);
    }
  } catch (error) {
    // Проверяем на ошибку тайм-аута
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Upload timeout for ${endpoint}`);
      throw new Error(`Upload timeout: File may be too large or connection is slow`);
    }
    
    // Очищаем таймер в случае других ошибок
    clearTimeout(timeoutId);
    throw error;
  }
}
