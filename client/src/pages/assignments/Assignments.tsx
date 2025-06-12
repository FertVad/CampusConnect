import React, { useState } from 'react';
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
import { useAssignments } from './useAssignments';
import CreateAssignmentDialog from './CreateAssignmentDialog';
import SubmitAssignmentDialog from './SubmitAssignmentDialog';

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

export default function Assignments() {
  const {
    assignments,
    subjects,
    isLoading,
    error,
    isStudent,
    isTeacher,
    selectedAssignment,
    setSelectedAssignment,
    createAssignmentMutation,
    submitAssignmentMutation,
  } = useAssignments();

  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  
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

      {isTeacher && (
        <CreateAssignmentDialog
          open={createAssignmentOpen}
          onOpenChange={setCreateAssignmentOpen}
          subjects={subjects}
          createAssignment={createAssignmentMutation.mutate}
          loading={createAssignmentMutation.isPending}
        />
      )}

      {isStudent && (
        <SubmitAssignmentDialog
          open={submissionDialogOpen}
          onOpenChange={setSubmissionDialogOpen}
          selected={selectedAssignment}
          submitAssignment={submitAssignmentMutation.mutate}
          loading={submitAssignmentMutation.isPending}
        />
      )}
    </div>
  );
}