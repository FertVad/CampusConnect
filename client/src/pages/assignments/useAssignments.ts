import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient as globalClient } from '@/lib/queryClient';
import * as z from 'zod';

export const createAssignmentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  subjectId: z.string().min(1, 'Subject is required'),
  dueDate: z.string().min(1, 'Due date is required'),
});

export const submitAssignmentSchema = z.object({
  content: z.string().min(10, 'Submission content must be at least 10 characters'),
  status: z.enum(['completed']),
});

export function useAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  const { data: assignments, isLoading, error } = useQuery({
    queryKey: [isStudent ? '/api/assignments/student' : '/api/assignments/teacher'],
    queryFn: async () => {
      const endpoint = isStudent ? '/api/assignments/student' : '/api/assignments/teacher';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      return await response.json();
    },
    enabled: !!user,
  });

  const { data: subjects } = useQuery({
    queryKey: [`/api/subjects/teacher/${user?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/subjects/teacher/${user!.id}`);
      if (!response.ok) throw new Error('Failed to fetch subjects');
      return await response.json();
    },
    enabled: !!isTeacher,
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createAssignmentSchema>) => {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, teacherId: user!.id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create assignment');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Assignment Created' });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments/teacher'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof submitAssignmentSchema> & { assignmentId: number }) => {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, studentId: user!.id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit assignment');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: 'Assignment Submitted', description: 'Your assignment has been submitted successfully.' });
      globalClient.invalidateQueries({ queryKey: ['/api/assignments/student'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    assignments,
    subjects,
    isLoading,
    error,
    selectedAssignment,
    setSelectedAssignment,
    createAssignmentMutation,
    submitAssignmentMutation,
    isStudent,
    isTeacher,
  };
}
