import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

import { MainLayout } from '@/components/layout/main-layout';
import AssignmentDetails from '@/components/assignments/AssignmentDetails';
import { Card, CardContent } from '@/components/ui/card';
import { uploadFile, putData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Assignment, Subject, User, Submission } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

const AssignmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const assignmentId = parseInt(id);
  
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get assignment details
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<Assignment>({
    queryKey: [`/api/assignments/${assignmentId}`],
  });
  
  // Get subject details
  const { data: subject, isLoading: isLoadingSubject } = useQuery<Subject>({
    queryKey: [`/api/subjects/${assignment?.subjectId}`],
    enabled: !!assignment?.subjectId,
  });
  
  // Get submission for student
  const { data: submission, isLoading: isLoadingSubmission } = useQuery<Submission[]>({
    queryKey: [`/api/submissions/assignment/${assignmentId}`],
    enabled: !!assignment && user?.role === 'student',
  });
  
  // Get submissions for teacher
  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery<Submission[]>({
    queryKey: [`/api/submissions/assignment/${assignmentId}`],
    enabled: !!assignment && user?.role === 'teacher',
  });
  
  // Get creator information
  const { data: creator, isLoading: isLoadingCreator } = useQuery<User>({
    queryKey: [`/api/users/${assignment?.createdBy}`],
    enabled: !!assignment?.createdBy,
  });
  
  // Mutation for submitting assignment (student)
  const submitAssignmentMutation = useMutation({
    mutationFn: (formData: FormData, { signal } = {}) => {
      formData.append('assignmentId', assignmentId.toString());
      formData.append('content', 'Submitted via file upload');
      return uploadFile('/api/submissions', formData, signal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/assignment/${assignmentId}`] });
      toast({
        title: 'Assignment Submitted',
        description: 'Your assignment has been submitted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error submitting assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Failed to submit your assignment. Please try again.',
      });
    },
  });
  
  // Mutation for grading assignment (teacher)
  const gradeAssignmentMutation = useMutation({
    mutationFn: (
      { submissionId, grade, feedback }: { submissionId: string; grade: number; feedback: string },
      { signal } = {},
    ) => {
      return putData(`/api/submissions/${submissionId}/grade`, { grade, feedback }, signal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/assignment/${assignmentId}`] });
      toast({
        title: 'Assignment Graded',
        description: 'The assignment has been graded successfully.',
      });
    },
    onError: (error) => {
      console.error('Error grading assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Grading Failed',
        description: 'Failed to grade the assignment. Please try again.',
      });
    },
  });
  
  const handleSubmit = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await submitAssignmentMutation.mutateAsync(formData);
  };
  
  const handleGrade = async (submissionId: string, grade: number, feedback: string) => {
    await gradeAssignmentMutation.mutateAsync({ submissionId, grade, feedback });
  };
  
  const isLoading = isLoadingAssignment || isLoadingSubject || isLoadingSubmission || isLoadingCreator;
  
  return (
    <MainLayout 
      title="Assignment Details"
      subtitle={assignment?.title}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="pt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : assignment ? (
        <AssignmentDetails
          assignment={assignment}
          subject={subject}
          submission={
            user?.role === 'student'
              ? submission && submission.length > 0
                ? submission[0]
                : undefined
              : submissions[0]
          }
          creator={creator}
          isTeacher={user?.role === 'teacher' || user?.role === 'admin'}
          onSubmit={handleSubmit}
          onGrade={handleGrade}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-neutral-500">Assignment not found</p>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
};

export default AssignmentDetail;
