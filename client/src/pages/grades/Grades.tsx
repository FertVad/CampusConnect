import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

import { MainLayout } from '@/components/layout/main-layout';
import GradeList from '@/components/grades/GradeList';
import GradeForm from '@/components/grades/GradeForm';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { postData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Grade, User, Subject } from '@shared/schema';
import { z } from 'zod';
import { insertGradeSchema } from '@shared/schema';

const Grades = () => {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<string>('view');
  
  // Get grades based on user role
  const { data: grades = [], isLoading } = useQuery<Grade[]>({
    queryKey: [user?.role === 'student' ? `/api/grades/student/${user?.id}` : '/api/grades'],
  });
  
  // Get all subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
  });
  
  // Get all students (for teachers/admins)
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    select: (data) => data.filter(user => user.role === 'student'),
    enabled: user?.role === 'teacher' || user?.role === 'admin',
  });
  
  // Mutation for creating grades
  const createGradeMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertGradeSchema>, { signal } = {}) => {
      return postData('/api/grades', data, signal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      toast({
        title: 'Grade Added',
        description: 'The grade has been added successfully.',
      });
    },
    onError: (error) => {
      console.error('Error adding grade:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Add Grade',
        description: 'An error occurred while adding the grade.',
      });
    },
  });
  
  const handleAddGrade = async (data: z.infer<typeof insertGradeSchema>) => {
    await createGradeMutation.mutateAsync(data);
  };
  
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  
  return (
    <MainLayout 
      title="Grades"
      subtitle={isTeacherOrAdmin ? "Manage student grades" : "View your academic performance"}
    >
      {isTeacherOrAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="view">View Grades</TabsTrigger>
            <TabsTrigger value="add">Add Grades</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view" className="pt-4">
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
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-neutral-500">
                      Select a student from the list to view their grades.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="add" className="pt-4">
            <GradeForm
              students={students}
              subjects={subjects}
              onSubmit={handleAddGrade}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
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
            <GradeList grades={grades} subjects={subjects} />
          )}
        </>
      )}
    </MainLayout>
  );
};

export default Grades;
