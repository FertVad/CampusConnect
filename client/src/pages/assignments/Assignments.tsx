import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Calendar, 
  ClipboardList, 
  Clock, 
  FileText, 
  Plus,
  Upload
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Status badge colors
const statusColors: Record<string, string> = {
  not_started: 'bg-slate-200 text-slate-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  graded: 'bg-purple-100 text-purple-800',
};

// Status display names
const statusDisplay: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Submitted',
  graded: 'Graded',
};

// Create Assignment form schema
const createAssignmentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  subjectId: z.string().min(1, 'Subject is required'),
  dueDate: z.string().min(1, 'Due date is required'),
});

// Submit Assignment form schema
const submitAssignmentSchema = z.object({
  content: z.string().min(10, 'Submission content must be at least 10 characters'),
  status: z.enum(['completed']),
});

export default function Assignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  
  // Fetch assignments based on user role
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: [isStudent ? '/api/assignments/student' : '/api/assignments/teacher'],
    queryFn: async () => {
      const endpoint = isStudent 
        ? `/api/assignments/student`
        : `/api/assignments/teacher`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      return await response.json();
    },
    enabled: !!user, // Only run query if user is authenticated
  });
  
  // Fetch subjects for teacher assignment creation
  const { data: subjects } = useQuery({
    queryKey: ['/api/subjects/teacher'],
    queryFn: async () => {
      const response = await fetch('/api/subjects/teacher');
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }
      return await response.json();
    },
    enabled: !!isTeacher, // Only fetch if user is a teacher
  });

  // Create assignment form
  const createAssignmentForm = useForm<z.infer<typeof createAssignmentSchema>>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      subjectId: '',
      dueDate: '',
    },
  });

  // Mutation for creating a new assignment
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createAssignmentSchema>) => {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          subjectId: parseInt(data.subjectId, 10),
          createdBy: user!.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create assignment');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Assignment Created',
        description: 'The assignment has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments/teacher'] });
      setCreateAssignmentOpen(false);
      createAssignmentForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  function onCreateAssignmentSubmit(data: z.infer<typeof createAssignmentSchema>) {
    createAssignmentMutation.mutate(data);
  }

  // Submission form
  const submissionForm = useForm<z.infer<typeof submitAssignmentSchema>>({
    resolver: zodResolver(submitAssignmentSchema),
    defaultValues: {
      content: '',
      status: 'completed',
    },
  });

  // Mutation for submitting an assignment
  const submitAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof submitAssignmentSchema> & { assignmentId: number }) => {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          studentId: user!.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit assignment');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Assignment Submitted',
        description: 'Your assignment has been submitted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments/student'] });
      setSubmissionDialogOpen(false);
      submissionForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  function onSubmitAssignment(data: z.infer<typeof submitAssignmentSchema>) {
    submitAssignmentMutation.mutate({
      ...data,
      assignmentId: selectedAssignment.id,
    });
  }
  
  // Group assignments by status for student view
  const groupedAssignments = React.useMemo(() => {
    if (!assignments || !isStudent) return {};
    
    return assignments.reduce((acc: Record<string, any[]>, assignment: any) => {
      const status = assignment.submission?.status || 'not_started';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(assignment);
      return acc;
    }, {});
  }, [assignments, isStudent]);
  
  // Sort assignments by due date for teacher view
  const sortedAssignments = React.useMemo(() => {
    if (!assignments || !isTeacher) return [];
    
    return [...assignments].sort((a, b) => {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [assignments, isTeacher]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Assignments</h1>
        {isTeacher && (
          <Button onClick={() => setCreateAssignmentOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load assignments. Please try again later.
          </AlertDescription>
        </Alert>
      ) : isStudent ? (
        // Student View
        <Tabs defaultValue="not_started">
          <TabsList className="mb-6">
            <TabsTrigger value="not_started">
              Not Started
              {groupedAssignments['not_started']?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {groupedAssignments['not_started']?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress
              {groupedAssignments['in_progress']?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {groupedAssignments['in_progress']?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Submitted
              {groupedAssignments['completed']?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {groupedAssignments['completed']?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded
              {groupedAssignments['graded']?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {groupedAssignments['graded']?.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {Object.keys(statusDisplay).map((status) => (
            <TabsContent key={status} value={status}>
              {!groupedAssignments[status]?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No {statusDisplay[status].toLowerCase()} assignments</h3>
                  <p className="mt-1">
                    {status === 'not_started' && 'All caught up! No new assignments.'}
                    {status === 'in_progress' && 'You don\'t have any assignments in progress.'}
                    {status === 'completed' && 'You haven\'t submitted any assignments yet.'}
                    {status === 'graded' && 'None of your submissions have been graded yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedAssignments[status]?.map((assignment: any) => (
                    <Card key={assignment.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{assignment.title}</CardTitle>
                            <CardDescription>
                              {assignment.subject?.name || 'Unknown Subject'}
                            </CardDescription>
                          </div>
                          <Badge className={statusColors[status]}>
                            {statusDisplay[status]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm line-clamp-3">
                            {assignment.description}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}</span>
                          </div>
                          {assignment.submission?.grade && (
                            <div className="flex items-center font-medium">
                              <span>Grade: {assignment.submission.grade}/100</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        {status === 'not_started' && (
                          <Button 
                            className="w-full" 
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setSubmissionDialogOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Submit Assignment
                          </Button>
                        )}
                        {status === 'completed' && (
                          <Button variant="outline" className="w-full" disabled>
                            <Clock className="h-4 w-4 mr-2" />
                            Awaiting Grade
                          </Button>
                        )}
                        {status === 'graded' && (
                          <Button variant="outline" className="w-full">
                            <FileText className="h-4 w-4 mr-2" />
                            View Feedback
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        // Teacher View
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Your Assignments</h2>
          {!sortedAssignments.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No assignments created</h3>
              <p className="mt-1">
                Get started by creating your first assignment for your students.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedAssignments.map((assignment: any) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription>
                      {assignment.subject?.name || 'Unknown Subject'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm line-clamp-3">
                        {assignment.description}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Submissions: </span>
                        <span>{assignment.submissions?.length || 0} / {assignment.studentCount || '?'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View Submissions
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Assignment Dialog for Teachers */}
      {isTeacher && (
        <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>
                Add a new assignment for your students.
              </DialogDescription>
            </DialogHeader>
            <Form {...createAssignmentForm}>
              <form onSubmit={createAssignmentForm.handleSubmit(onCreateAssignmentSubmit)} className="space-y-4">
                <FormField
                  control={createAssignmentForm.control}
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
                  control={createAssignmentForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the assignment" 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createAssignmentForm.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects?.map((subject: any) => (
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
                  control={createAssignmentForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCreateAssignmentOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAssignmentMutation.isPending}
                  >
                    {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Submit Assignment Dialog for Students */}
      {isStudent && (
        <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Submit Assignment</DialogTitle>
              <DialogDescription>
                {selectedAssignment?.title}
              </DialogDescription>
            </DialogHeader>
            <Form {...submissionForm}>
              <form onSubmit={submissionForm.handleSubmit(onSubmitAssignment)} className="space-y-4">
                <FormField
                  control={submissionForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your assignment submission" 
                          className="min-h-[150px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        You can also attach files or links to your work.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setSubmissionDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitAssignmentMutation.isPending}
                  >
                    {submitAssignmentMutation.isPending ? 'Submitting...' : 'Submit Assignment'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}