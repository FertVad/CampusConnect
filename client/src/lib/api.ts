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

// WebSocket connection for chat
export function createWebSocketConnection(userId: number, onMessage: (data: any) => void): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  // In development, we use the same origin as the current page
  // This avoids CORS issues since we're using Vite's proxy to connect to our server
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log(`Connecting to WebSocket at ${wsUrl}`);
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    // Authenticate the WebSocket connection with the user ID
    socket.send(JSON.stringify({ 
      type: 'auth', 
      userId 
    }));
    console.log('WebSocket connection established');
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message', error);
    }
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error', error);
  };
  
  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return socket;
}

// Send chat message through WebSocket
export function sendChatMessage(socket: WebSocket, toUserId: number, content: string): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'message',
      toUserId,
      content
    }));
  } else {
    console.error('WebSocket is not connected');
  }
}

// Mark message as read through WebSocket
export function markMessageAsRead(socket: WebSocket, messageId: number): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'markAsRead',
      messageId
    }));
  } else {
    console.error('WebSocket is not connected');
  }
}
