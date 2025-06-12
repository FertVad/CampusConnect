import { apiRequest } from "./queryClient";
import { getAuthHeaders } from "./auth";

// Generic fetch function for GET requests with improved Safari compatibility
export async function fetchData<T>(endpoint: string): Promise<T> {
  // Тайм-аут для запросов - 30 секунд
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET', // Явно указываем метод
      headers: {
        ...getAuthHeaders(),
        // Дополнительные заголовки для Safari
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'include', // Всегда включаем куки
      mode: 'cors', // Для лучшей совместимости
      redirect: 'follow', // Следуем за перенаправлениями
      signal: controller.signal // Для тайм-аута
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
export async function postData<T>(endpoint: string, data: any): Promise<T> {
  const response = await apiRequest('POST', endpoint, data);
  return await response.json() as T;
}

// Generic put function
export async function putData<T>(endpoint: string, data: any): Promise<T> {
  const response = await apiRequest('PUT', endpoint, data);
  return await response.json() as T;
}

// Generic delete function
export async function deleteData(endpoint: string): Promise<void> {
  await apiRequest('DELETE', endpoint);
}

// Upload file with form data - improved Safari compatibility
export async function uploadFile(endpoint: string, formData: FormData): Promise<any> {
  // Тайм-аут для запросов - 60 секунд для больших файлов
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  
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
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...formHeaders,
        // Safari-friendly headers
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      body: formData,
      credentials: 'include',
      mode: 'cors',
      redirect: 'follow',
      signal: controller.signal // Для тайм-аута
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

// WebSocket connection for chat with cross-browser compatibility
export function createWebSocketConnection(userId: number | undefined | null, onMessage: (data: any) => void): WebSocket | null {
  // Check if user is logged in and has userId
  if (!userId) {
    return null;
  }
  
  try {
    // Get user authentication status from localStorage
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      return null;
    }

    // Determine the WebSocket URL
    const wsUrl = import.meta.env.VITE_WS_URL || 
                  `wss://${window.location.host}`;
                  
    // Only create WebSocket if we have a valid URL and user ID
    if (!wsUrl || wsUrl.includes('undefined')) {
      return null;
    }

    
    // Create WebSocket connection
    const socket = new WebSocket(`${wsUrl}/?token=${userId}`);
    
    // Set up event handlers
    socket.onopen = () => {
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = (event) => {
    };
    
    return socket;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return null;
  }
}

// Send chat message through WebSocket with Safari compatibility
export function sendChatMessage(socket: WebSocket | null, toUserId: number, content: string): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    const message = JSON.stringify({
      type: 'message',
      to: toUserId,
      content: content,
      timestamp: new Date().toISOString()
    });
    
    socket.send(message);
    return true;
  } catch (error) {
    console.error('Error sending chat message:', error);
    return false;
  }
}

// Mark message as read through WebSocket with Safari compatibility
export function markMessageAsRead(socket: WebSocket | null, messageId: number): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    const message = JSON.stringify({
      type: 'mark_read',
      messageId: messageId,
      timestamp: new Date().toISOString()
    });
    
    socket.send(message);
    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
}
