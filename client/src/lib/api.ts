import { apiRequest } from "./queryClient";
import { getAuthHeaders } from "./auth";

// Generic fetch function for GET requests
export async function fetchData<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching data from ${endpoint}: ${response.statusText}`);
  }
  
  return await response.json() as T;
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

// Upload file with form data
export async function uploadFile(endpoint: string, formData: FormData): Promise<any> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Error uploading file to ${endpoint}: ${response.statusText}`);
  }
  
  return await response.json();
}

// WebSocket connection for chat with cross-browser compatibility
export function createWebSocketConnection(userId: number, onMessage: (data: any) => void): WebSocket | null {
  // Check if WebSocket is supported
  if (!('WebSocket' in window)) {
    console.error('WebSocket is not supported by this browser');
    return null;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  // In development, we use the same origin as the current page
  // This avoids CORS issues since we're using Vite's proxy to connect to our server
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log(`Connecting to WebSocket at ${wsUrl}`);
  
  let socket: WebSocket;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  
  try {
    socket = new WebSocket(wsUrl);
    
    // Set a connection timeout for Safari which can hang indefinitely
    const connectionTimeout = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket connection timeout, closing and retrying...');
        socket.close();
        
        // Try to reconnect if we haven't reached max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
          createWebSocketConnection(userId, onMessage);
        }
      }
    }, 5000); // 5 second timeout
    
    socket.onopen = () => {
      clearTimeout(connectionTimeout);
      reconnectAttempts = 0;
      
      // Authenticate the WebSocket connection with the user ID
      try {
        socket.send(JSON.stringify({ 
          type: 'auth', 
          userId 
        }));
        console.log('WebSocket connection established');
      } catch (err) {
        console.error('Error sending authentication message:', err);
      }
    };
    
    socket.onmessage = (event) => {
      try {
        // Safari sometimes fails to parse JSON, so we add additional error handling
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error', error);
    };
    
    socket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      
      // Attempt to reconnect if not a clean close and we haven't reached max attempts
      if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
        
        // Add delay before reconnecting
        setTimeout(() => {
          createWebSocketConnection(userId, onMessage);
        }, 1000 * reconnectAttempts); // Exponential backoff
      }
    };
    
    return socket;
    
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return null;
  }
}

// Send chat message through WebSocket with Safari compatibility
export function sendChatMessage(socket: WebSocket | null, toUserId: number, content: string): boolean {
  if (!socket) {
    console.error('WebSocket is null');
    return false;
  }
  
  if (socket.readyState === WebSocket.OPEN) {
    try {
      // Create the message payload
      const payload = JSON.stringify({
        type: 'message',
        toUserId,
        content
      });
      
      // Use a try-catch to handle potential issues in Safari
      socket.send(payload);
      return true;
    } catch (error) {
      console.error('Error sending chat message:', error);
      return false;
    }
  } else {
    console.error('WebSocket is not connected, state:', socket.readyState);
    return false;
  }
}

// Mark message as read through WebSocket with Safari compatibility
export function markMessageAsRead(socket: WebSocket | null, messageId: number): boolean {
  if (!socket) {
    console.error('WebSocket is null');
    return false;
  }
  
  if (socket.readyState === WebSocket.OPEN) {
    try {
      // Create the message payload
      const payload = JSON.stringify({
        type: 'markAsRead',
        messageId
      });
      
      // Use a try-catch to handle potential issues in Safari
      socket.send(payload);
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  } else {
    console.error('WebSocket is not connected, state:', socket.readyState);
    return false;
  }
}
