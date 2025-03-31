import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';

import MainLayout from '@/components/layouts/MainLayout';
import ChatInterface from '@/components/chat/ChatInterface';
import { Card, CardContent } from '@/components/ui/card';
import { Message, User } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

const Chat = () => {
  const { id } = useParams<{ id: string }>();
  const initialSelectedUserId = id ? parseInt(id) : null;
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Get all users that can be messaged
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user,
  });
  
  // Get messages between the current user and selected user
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/messages/between/${user?.id}/${selectedUser?.id}`],
    enabled: !!user && !!selectedUser,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });
  
  // Set the selected user if specified in the URL
  useEffect(() => {
    if (initialSelectedUserId && users.length > 0 && !selectedUser) {
      const user = users.find(u => u.id === initialSelectedUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [initialSelectedUserId, users, selectedUser]);
  
  // Setup WebSocket connection for real-time messages
  useEffect(() => {
    if (!user) return;
    
    // This is for real-time updates from WebSocket
    // The actual WebSocket setup is in the ChatInterface component
    
    // Periodically refresh messages
    const interval = setInterval(() => {
      if (selectedUser) {
        queryClient.invalidateQueries({
          queryKey: [`/api/messages/between/${user.id}/${selectedUser.id}`]
        });
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [user, selectedUser, queryClient]);
  
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
  };
  
  const isLoading = isLoadingUsers || (selectedUser && isLoadingMessages);
  
  return (
    <MainLayout 
      title="Chat"
      subtitle="Communicate with students, teachers, and administrators"
    >
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-8 w-8 bg-neutral-200 rounded-full mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ) : user ? (
        <div className="h-[calc(100vh-16rem)]">
          <ChatInterface
            currentUser={user}
            selectedUser={selectedUser}
            users={users}
            messages={messages}
            onSelectUser={handleSelectUser}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-neutral-500">Please log in to access chat</p>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
};

export default Chat;
