import React, { useState } from 'react';
import { Assignment, Subject, Submission, User } from '@shared/schema';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertCircle, Calendar, Clock, File, Upload, User as UserIcon } from 'lucide-react';
import FileUpload from '@/components/files/FileUpload';
import { getStatusColor } from '@/lib/utils';

interface AssignmentDetailsProps {
  assignment: Assignment;
  subject?: Subject;
  submission?: Submission;
  creator?: User;
  isTeacher: boolean;
  onSubmit: (formData: FormData) => Promise<any>;
  onGrade?: (submissionId: number, grade: number, feedback: string) => Promise<any>;
}

const AssignmentDetails: React.FC<AssignmentDetailsProps> = ({
  assignment,
  subject,
  submission,
  creator,
  isTeacher,
  onSubmit,
  onGrade
}) => {
  const [gradeValue, setGradeValue] = useState<string>(submission?.grade?.toString() || '');
  const [feedback, setFeedback] = useState<string>(submission?.feedback || '');
  
  const dueDate = new Date(assignment.dueDate);
  const isPastDue = dueDate < new Date();
  
  const handleGradeSubmit = async () => {
    if (!submission) return;
    
    const grade = parseInt(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      alert('Please enter a valid grade between 0 and 100');
      return;
    }
    
    if (onGrade) {
      await onGrade(submission.id, grade, feedback);
    }
  };
  
  // Get status display
  const getStatusDisplay = () => {
    if (!submission) {
      return <Badge variant="outline" className="bg-primary bg-opacity-10 text-primary border-0">Not Started</Badge>;
    }
    
    const statusText = submission.status
      .replace('_', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
    
    return (
      <Badge 
        variant="outline" 
        className={`bg-${getStatusColor(submission.status)} bg-opacity-10 text-${getStatusColor(submission.status)} border-0`}
      >
        {statusText}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-heading">{assignment.title}</CardTitle>
              <CardDescription>
                {subject?.name || `Subject ${assignment.subjectId}`}
              </CardDescription>
            </div>
            {getStatusDisplay()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:justify-between gap-4">
            <div className="flex items-center text-sm text-neutral-600">
              <Calendar className="h-4 w-4 mr-2 text-neutral-500" />
              <span>Due: {formatDate(assignment.dueDate)}</span>
              {isPastDue && !submission && (
                <span className="ml-2 text-error flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Past due
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-neutral-600">
              <UserIcon className="h-4 w-4 mr-2 text-neutral-500" />
              <span>Created by: {creator ? `${creator.firstName} ${creator.lastName}` : 'Teacher'}</span>
            </div>
            <div className="flex items-center text-sm text-neutral-600">
              <Clock className="h-4 w-4 mr-2 text-neutral-500" />
              <span>Posted: {formatDate(assignment.createdAt)}</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-neutral-200">
            <h3 className="text-lg font-medium font-heading mb-2">Assignment Description</h3>
            <p className="text-neutral-700 whitespace-pre-line">{assignment.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Show submission section for students */}
      {!isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Your Submission</CardTitle>
            {submission && submission.submittedAt && (
              <CardDescription>
                Submitted on {formatDate(submission.submittedAt, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {submission && submission.status === 'graded' ? (
              <div className="space-y-4">
                {submission.content && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Your Response:</h4>
                    <p className="text-neutral-700 whitespace-pre-line p-3 bg-neutral-50 rounded-lg">{submission.content}</p>
                  </div>
                )}
                
                {submission.fileUrl && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Attached File:</h4>
                    <div className="flex items-center bg-neutral-50 p-3 rounded-lg">
                      <File className="h-5 w-5 text-neutral-500 mr-3" />
                      <span className="text-primary hover:text-primary-dark">
                        <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                          View Attachment
                        </a>
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 p-4 border rounded-lg border-success bg-success bg-opacity-5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-success font-medium">Grade: {submission.grade}/100</h4>
                  </div>
                  {submission.feedback && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium mb-1">Teacher Feedback:</h5>
                      <p className="text-neutral-700">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <FileUpload
                onUpload={onSubmit}
                fieldName="file"
                acceptedFileTypes=".pdf,.doc,.docx,.txt,.jpg,.png"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Show grading section for teachers */}
      {isTeacher && submission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Student Submission</CardTitle>
            {submission.submittedAt && (
              <CardDescription>
                Submitted on {formatDate(submission.submittedAt, { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.content && (
              <div>
                <h4 className="text-sm font-medium mb-2">Student Response:</h4>
                <p className="text-neutral-700 whitespace-pre-line p-3 bg-neutral-50 rounded-lg">{submission.content}</p>
              </div>
            )}
            
            {submission.fileUrl && (
              <div>
                <h4 className="text-sm font-medium mb-2">Attached File:</h4>
                <div className="flex items-center bg-neutral-50 p-3 rounded-lg">
                  <File className="h-5 w-5 text-neutral-500 mr-3" />
                  <span className="text-primary hover:text-primary-dark">
                    <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                      View Attachment
                    </a>
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-4 pt-4 border-t border-neutral-200 mt-4">
              <h4 className="font-medium">Provide Feedback</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Grade (out of 100)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    placeholder="Enter grade"
                    className="w-full"
                  />
                </div>
                
                <div className="text-right self-end">
                  <Button 
                    onClick={handleGradeSubmit}
                    disabled={submission.status === 'graded'}
                  >
                    {submission.status === 'graded' ? 'Already Graded' : 'Submit Grade'}
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Feedback
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the student"
                  rows={4}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssignmentDetails;
