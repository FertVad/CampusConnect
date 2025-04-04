import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, CheckCheck, Send, User, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Helper function to get initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Helper function to format message timestamp
function formatMessageTime(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  
  // If today, show time only
  if (messageDate.toDateString() === now.toDateString()) {
    return format(messageDate, 'h:mm a');
  }
  
  // If this year, show month and day
  if (messageDate.getFullYear() === now.getFullYear()) {
    return format(messageDate, 'MMM d, h:mm a');
  }
  
  // Otherwise show full date
  return format(messageDate, 'MMM d, yyyy, h:mm a');
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch users for chat selection
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users/chat'],
    queryFn: async () => {
      const response = await fetch('/api/users/chat');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return await response.json();
    },
    enabled: !!user,
  });
  
  // Fetch messages with selected user
  const { 
    data: messages, 
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['/api/messages', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      
      const response = await fetch(`/api/messages/${selectedUser.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return await response.json();
    },
    enabled: !!selectedUser, // Only fetch if a user is selected
  });
  
  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds: number[]) => {
      if (!messageIds.length) return;
      
      const response = await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark messages as read');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUser?.id] });
    },
  });
  
  // Set up WebSocket connection
  useEffect(() => {
    // Проверка наличия пользователя и его токена перед созданием соединения
    if (!user || !user.id) {
      console.log('WebSocket not initialized: User not authenticated');
      setConnectionStatus('disconnected');
      return;
    }
    
    // Создаем защищенную переменную для отслеживания состояния эффекта
    let isActive = true;
    
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Attempting to connect WebSocket to:', wsUrl);
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        // Проверяем, что эффект все еще активен и пользователь авторизован
        if (!isActive || !user || !user.id) {
          console.log('WebSocket opened but component unmounted or user logged out - closing');
          socket.close();
          return;
        }
        
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
        
        // Send authentication message
        try {
          socket.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
          }));
        } catch (err) {
          console.error('Error sending auth message:', err);
        }
      };
    
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === 'message') {
          // If message is related to current chat, refetch messages
          if (
            (data.fromUserId === user.id && data.toUserId === selectedUser?.id) ||
            (data.fromUserId === selectedUser?.id && data.toUserId === user.id)
          ) {
            refetchMessages();
          } else {
            // Notify user about new message from other person
            const sender = users?.find((u: any) => u.id === data.fromUserId);
            if (sender) {
              toast({
                title: 'New Message',
                description: `${sender.firstName} ${sender.lastName}: ${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}`,
              });
            }
          }
        } else if (data.type === 'status') {
          // Update message status (delivered, read)
          queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedUser?.id] });
        }
      };
      
      socket.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('disconnected');
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      // Установка WebSocket только если пользователь авторизован
      if (user && user.id) {
        setWebSocket(socket);
      
        // Clean up connection on unmount or when user logs out
        return () => {
          // Отмечаем что эффект больше не активен
          isActive = false;
          
          if (socket && socket.readyState === WebSocket.OPEN) {
            console.log('Closing WebSocket connection on cleanup');
            try {
              socket.close();
            } catch (err) {
              console.error('Error closing WebSocket:', err);
            }
          }
        };
      }
      
      // Если до этого момента return не был выполнен, значит что-то пошло не так
      return () => {
        isActive = false; // на всякий случай
      };
      
    } catch (err) {
      console.error('Error establishing WebSocket connection:', err);
      return () => {
        // Nothing to clean up if connection failed
      };
    }
  }, [user]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Mark received messages as read when viewing a conversation
  useEffect(() => {
    if (messages && selectedUser) {
      // Find messages that are from the selected user and not read yet
      const unreadMessageIds = messages
        .filter((msg: any) => msg.fromUserId === selectedUser.id && msg.status !== 'read')
        .map((msg: any) => msg.id);
      
      if (unreadMessageIds.length > 0) {
        markAsReadMutation.mutate(unreadMessageIds);
        
        // Also notify through WebSocket that messages were read
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
          webSocket.send(JSON.stringify({
            type: 'read',
            messageIds: unreadMessageIds,
            userId: user!.id,
            otherUserId: selectedUser.id,
          }));
        }
      }
    }
  }, [messages, selectedUser]);
  
  // Handle sending a new message
  const handleSendMessage = () => {
    if (!message.trim() || !selectedUser || !webSocket) return;
    
    // Send through WebSocket
    if (webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(JSON.stringify({
        type: 'message',
        content: message,
        fromUserId: user!.id,
        toUserId: selectedUser.id,
      }));
      
      // Immediately add message to UI (optimistic update)
      const tempMessage = {
        id: `temp-${Date.now()}`,
        content: message,
        fromUserId: user!.id,
        toUserId: selectedUser.id,
        sentAt: new Date(),
        status: 'sent',
        isTemp: true, // To identify temporary messages
      };
      
      queryClient.setQueryData(['/api/messages', selectedUser.id], (oldData: any) => {
        return [...(oldData || []), tempMessage];
      });
      
      // Clear input
      setMessage('');
      
      // Will be replaced by refetch when server confirms
      setTimeout(() => {
        refetchMessages();
      }, 1000);
    } else {
      toast({
        title: 'Connection Error',
        description: 'Not connected to the chat server. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Groups users by role for easier navigation
  const usersByRole = React.useMemo(() => {
    if (!users) return {};
    
    return users.reduce((acc: Record<string, any[]>, user: any) => {
      if (user.id === user?.id) return acc; // Skip current user
      
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {});
  }, [users]);
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[75vh]">
        {/* User list sidebar */}
        <div className="col-span-1 md:border-r pr-0 md:pr-4">
          <div className="sticky top-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contacts</h2>
              <Badge variant={connectionStatus === 'connected' ? 'outline' : 'destructive'}>
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            
            {usersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : usersError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load contacts. Please try again later.
                </AlertDescription>
              </Alert>
            ) : !users?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No contacts found</h3>
                <p className="mt-1">You don't have any contacts yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[65vh]">
                <div className="space-y-4">
                  {/* Show teachers */}
                  {usersByRole['teacher']?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Teachers</h3>
                      <div className="space-y-2">
                        {usersByRole['teacher'].map((chatUser: any) => (
                          <div
                            key={chatUser.id}
                            className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer ${
                              selectedUser?.id === chatUser.id
                                ? 'bg-secondary'
                                : 'hover:bg-secondary/50'
                            }`}
                            onClick={() => setSelectedUser(chatUser)}
                          >
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(chatUser.firstName, chatUser.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {chatUser.firstName} {chatUser.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">Teacher</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show students */}
                  {usersByRole['student']?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Students</h3>
                      <div className="space-y-2">
                        {usersByRole['student'].map((chatUser: any) => (
                          <div
                            key={chatUser.id}
                            className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer ${
                              selectedUser?.id === chatUser.id
                                ? 'bg-secondary'
                                : 'hover:bg-secondary/50'
                            }`}
                            onClick={() => setSelectedUser(chatUser)}
                          >
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(chatUser.firstName, chatUser.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {chatUser.firstName} {chatUser.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">Student</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show administrators */}
                  {usersByRole['admin']?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Administrators</h3>
                      <div className="space-y-2">
                        {usersByRole['admin'].map((chatUser: any) => (
                          <div
                            key={chatUser.id}
                            className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer ${
                              selectedUser?.id === chatUser.id
                                ? 'bg-secondary'
                                : 'hover:bg-secondary/50'
                            }`}
                            onClick={() => setSelectedUser(chatUser)}
                          >
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(chatUser.firstName, chatUser.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {chatUser.firstName} {chatUser.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">Admin</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="col-span-1 md:col-span-3">
          {!selectedUser ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">Select a contact</h3>
                <p className="text-muted-foreground">
                  Choose a contact from the list to start messaging
                </p>
              </div>
            </div>
          ) : (
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>
                      {getInitials(selectedUser.firstName, selectedUser.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto p-4">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] ${i % 2 === 0 ? 'mr-auto' : 'ml-auto'}`}>
                          <Skeleton className="h-12 w-[200px] rounded-lg" />
                          <Skeleton className="h-4 w-24 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !messages?.length ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h3 className="text-lg font-medium">No messages yet</h3>
                      <p className="text-muted-foreground">
                        Send a message to start the conversation
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg: any, index: number) => {
                      const isSentByMe = msg.fromUserId === user?.id;
                      
                      // Group messages by date
                      const showDateSeparator = index === 0 || 
                        new Date(msg.sentAt).toDateString() !== 
                        new Date(messages[index - 1].sentAt).toDateString();
                      
                      return (
                        <React.Fragment key={msg.id || `temp-${index}`}>
                          {showDateSeparator && (
                            <div className="relative my-6">
                              <div className="absolute inset-0 flex items-center">
                                <Separator />
                              </div>
                              <div className="relative flex justify-center">
                                <span className="bg-background px-2 text-xs text-muted-foreground">
                                  {format(new Date(msg.sentAt), 'MMMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] ${isSentByMe ? 'ml-auto' : 'mr-auto'}`}>
                              <div 
                                className={`p-3 rounded-lg ${
                                  isSentByMe 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                                }`}
                              >
                                <p>{msg.content}</p>
                              </div>
                              <div className={`flex items-center mt-1 text-xs text-muted-foreground ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                                <span>{formatMessageTime(new Date(msg.sentAt))}</span>
                                {isSentByMe && (
                                  <span className="ml-1">
                                    {msg.status === 'read' ? (
                                      <CheckCheck className="h-3 w-3 text-primary" />
                                    ) : msg.status === 'delivered' ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3 opacity-50" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="p-3 border-t">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={connectionStatus !== 'connected'}
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || connectionStatus !== 'connected'}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}