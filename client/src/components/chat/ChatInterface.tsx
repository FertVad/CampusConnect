import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Send, User as UserIcon } from 'lucide-react';
import { createWebSocketConnection, sendChatMessage, markMessageAsRead } from '@/lib/api';

interface ChatInterfaceProps {
  currentUser: User;
  selectedUser: User | null;
  users: User[];
  messages: Message[];
  onSelectUser: (user: User) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  currentUser, 
  selectedUser, 
  users, 
  messages, 
  onSelectUser 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Filter out the current user from the list of users
  const chatUsers = users.filter(user => user.id !== currentUser.id);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark messages as read
    if (selectedUser && socket && socket.readyState === WebSocket.OPEN) {
      messages.forEach(message => {
        if (message.fromUserId === selectedUser.id && message.status !== 'read') {
          markMessageAsRead(socket, message.id);
        }
      });
    }
  }, [messages, selectedUser, socket]);
  
  useEffect(() => {
    // Connect to WebSocket
    const ws = createWebSocketConnection(currentUser.id, handleWebSocketMessage);
    setSocket(ws);
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [currentUser.id]);
  
  const handleWebSocketMessage = (data: any) => {
    // Handle incoming WebSocket messages
    console.log('WebSocket message received:', data);
    // The actual message update is handled by React Query in the parent component
  };
  
  const handleSendMessage = () => {
    if (!selectedUser || !newMessage.trim() || !socket) return;
    
    sendChatMessage(socket, selectedUser.id, newMessage);
    setNewMessage('');
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
      {/* Users list */}
      <Card className="md:col-span-1 h-full">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-16rem)]">
          <div className="space-y-1">
            {chatUsers.length === 0 ? (
              <div className="p-4 text-center text-neutral-500">
                No contacts available
              </div>
            ) : (
              chatUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-primary bg-opacity-10 text-primary'
                      : 'hover:bg-neutral-50'
                  }`}
                  onClick={() => onSelectUser(user)}
                >
                  <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center mr-3">
                    <UserIcon className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Chat area */}
      <Card className="md:col-span-3 flex flex-col h-full">
        <CardHeader className="border-b">
          {selectedUser ? (
            <CardTitle className="text-lg font-heading flex items-center">
              <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center mr-2">
                <UserIcon className="h-4 w-4 text-neutral-500" />
              </div>
              {selectedUser.firstName} {selectedUser.lastName}
            </CardTitle>
          ) : (
            <CardTitle className="text-lg font-heading">
              Select a contact to start chatting
            </CardTitle>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedUser ? (
            <div className="h-full flex items-center justify-center text-neutral-500">
              <p>Select a contact to view messages</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isFromCurrentUser = message.fromUserId === currentUser.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      isFromCurrentUser
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-neutral-100 text-neutral-800 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isFromCurrentUser ? 'text-primary-50' : 'text-neutral-500'
                      }`}
                    >
                      {formatDate(message.sentAt, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        
        {selectedUser && (
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 mr-2"
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ChatInterface;
