import React, { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import MainLayout from '@/components/layouts/MainLayout';
import AssignmentList from '@/components/assignments/AssignmentList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertAssignmentSchema } from '@shared/schema';
import { apiRequest, postData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Extended schema with validation for forms
const assignmentFormSchema = insertAssignmentSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Please provide a valid date",
  }),
  subjectId: z.number().positive("Please select a subject"),
});

const Assignments = () => {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get assignments based on user role
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: [user?.role === 'student' ? `/api/assignments/student/${user?.id}` : `/api/assignments/teacher/${user?.id}`],
  });
  
  // Get subjects for the assignment creation form
  const { data: subjects = [] } = useQuery({
    queryKey: ['/api/subjects'],
  });
  
  // Form for creating new assignments (teachers only)
  const form = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      subjectId: 0,
      createdBy: user?.id ?? 0,
    },
  });
  
  // Mutation for creating assignments
  const createAssignmentMutation = useMutation({
    mutationFn: (data: z.infer<typeof assignmentFormSchema>) => {
      return postData('/api/assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/teacher/${user?.id}`] });
      toast({
        title: 'Assignment Created',
        description: 'The assignment has been created successfully.',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error('Error creating assignment:', error);
      setError('Failed to create assignment. Please try again.');
    },
  });
  
  const onSubmit = (data: z.infer<typeof assignmentFormSchema>) => {
    setError(null);
    createAssignmentMutation.mutate(data);
  };
  
  const canCreateAssignments = user?.role === 'teacher' || user?.role === 'admin';
  
  return (
    <MainLayout 
      title="Assignments"
      subtitle="View and manage your assignments"
    >
      <div className="space-y-6">
        {canCreateAssignments && (
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Assignment</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new assignment for your students.
                  </DialogDescription>
                </DialogHeader>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Assignment title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide detailed instructions for the assignment" 
                              rows={4}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="subjectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id.toString()}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit"
                        disabled={createAssignmentMutation.isPending}
                      >
                        {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
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
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-neutral-500">No assignments found</p>
              {canCreateAssignments && (
                <p className="text-sm text-neutral-400 mt-2">
                  Click the "Create Assignment" button to get started.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <AssignmentList assignments={assignments} />
        )}
      </div>
    </MainLayout>
  );
};

export default Assignments;
