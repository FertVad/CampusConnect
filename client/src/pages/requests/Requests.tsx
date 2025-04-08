import React, { useContext, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

import { MainLayout } from '@/components/layout/main-layout';
import RequestList from '@/components/requests/RequestList';
import RequestForm from '@/components/requests/RequestForm';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { postData, putData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Request, User } from '@shared/schema';
import { z } from 'zod';
import { insertRequestSchema } from '@shared/schema';
import { useLocation } from 'wouter';

const Requests = () => {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Parse the hash from the URL if any (for direct linking to a specific request)
  const requestIdFromHash = location.includes('#') ? parseInt(location.split('#')[1]) : null;
  
  // Get requests based on user role
  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: [user?.role === 'student' ? `/api/requests/student/${user?.id}` : '/api/requests'],
  });
  
  // Get all users for displaying names
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin' || user?.role === 'teacher',
  });
  
  // Mutation for creating requests (student)
  const createRequestMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertRequestSchema>) => {
      return postData('/api/requests', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/requests/student/${user?.id}`] });
      toast({
        title: 'Request Submitted',
        description: 'Your request has been submitted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error submitting request:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Submit Request',
        description: 'An error occurred while submitting your request.',
      });
    },
  });
  
  // Mutation for updating request status (admin/teacher)
  const updateRequestStatusMutation = useMutation({
    mutationFn: ({ requestId, status, resolution }: { requestId: number; status: 'approved' | 'rejected'; resolution: string }) => {
      return putData(`/api/requests/${requestId}/status`, { status, resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      toast({
        title: 'Request Updated',
        description: 'The request status has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating request status:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Update Request',
        description: 'An error occurred while updating the request status.',
      });
    },
  });
  
  const handleSubmitRequest = async (data: z.infer<typeof insertRequestSchema>) => {
    await createRequestMutation.mutateAsync(data);
  };
  
  const handleUpdateRequestStatus = async (requestId: number, status: 'approved' | 'rejected', resolution: string) => {
    await updateRequestStatusMutation.mutateAsync({ requestId, status, resolution });
  };
  
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';
  
  // Set active tab based on user role
  const [activeTab, setActiveTab] = React.useState(isStudent ? 'submit' : 'pending');
  
  // Scroll to the requested element if hash is present
  useEffect(() => {
    if (requestIdFromHash) {
      const element = document.getElementById(`request-${requestIdFromHash}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [requestIdFromHash, requests]);
  
  return (
    <MainLayout 
      title="Requests"
      subtitle={isStudent ? "Submit and track your requests" : "Manage student requests"}
    >
      {isStudent ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="submit">Submit Request</TabsTrigger>
            <TabsTrigger value="history">Request History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="submit" className="pt-4">
            <RequestForm onSubmit={handleSubmitRequest} />
          </TabsContent>
          
          <TabsContent value="history" className="pt-4">
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
              <RequestList requests={requests} />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="pt-4">
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
              <RequestList 
                requests={requests.filter(r => r.status === 'pending')} 
                users={users}
                isAdmin={isAdmin}
                onUpdateStatus={handleUpdateRequestStatus}
              />
            )}
          </TabsContent>
          
          <TabsContent value="all" className="pt-4">
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
              <RequestList 
                requests={requests} 
                users={users}
                isAdmin={isAdmin}
                onUpdateStatus={handleUpdateRequestStatus}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </MainLayout>
  );
};

export default Requests;
