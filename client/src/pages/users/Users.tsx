import React, { useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import MainLayout from '@/components/layouts/MainLayout';
import UserList from '@/components/users/UserList';
import { Card, CardContent } from '@/components/ui/card';
import { postData, putData, deleteData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { Redirect } from 'wouter';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';

const Users = () => {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Redirect to="/dashboard" />;
  }
  
  // Get all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Mutation for creating users
  const createUserMutation = useMutation({
    mutationFn: (userData: z.infer<typeof insertUserSchema>) => {
      return postData('/api/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User Created',
        description: 'The user has been created successfully.',
      });
    },
    onError: (error) => {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Create User',
        description: 'An error occurred while creating the user.',
      });
    },
  });
  
  // Mutation for updating users
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: number; userData: Partial<z.infer<typeof insertUserSchema>> }) => {
      return putData(`/api/users/${userId}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User Updated',
        description: 'The user has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Update User',
        description: 'An error occurred while updating the user.',
      });
    },
  });
  
  // Mutation for deleting users
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => {
      return deleteData(`/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User Deleted',
        description: 'The user has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Delete User',
        description: 'An error occurred while deleting the user.',
      });
    },
  });
  
  const handleCreateUser = async (userData: z.infer<typeof insertUserSchema>) => {
    await createUserMutation.mutateAsync(userData);
  };
  
  const handleUpdateUser = async (userId: number, userData: Partial<z.infer<typeof insertUserSchema>>) => {
    await updateUserMutation.mutateAsync({ userId, userData });
  };
  
  const handleDeleteUser = async (userId: number) => {
    await deleteUserMutation.mutateAsync(userId);
  };
  
  return (
    <MainLayout 
      title="User Management"
      subtitle="Manage users, roles, and permissions"
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
      ) : (
        <UserList
          users={users}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )}
    </MainLayout>
  );
};

export default Users;
