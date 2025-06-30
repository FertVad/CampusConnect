import React from 'react';
import { Link } from 'wouter';
import { Assignment, Submission, Subject } from '@shared/schema';
import { getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AssignmentWithSubmission extends Assignment {
  subject?: Subject;
  submission?: Submission;
}

interface AssignmentListProps {
  assignments: AssignmentWithSubmission[];
  viewOnly?: boolean;
}

const AssignmentList: React.FC<AssignmentListProps> = ({ assignments, viewOnly = false }) => {
  // Function to determine status text
  const getStatusText = (assignment: AssignmentWithSubmission) => {
    if (!assignment.submission) return 'Not Started';
    return assignment.submission.status
      .replace('_', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };
  
  // Function to get the due date display
  const getDueDateDisplay = (dueDate: Date) => {
    const now = new Date();
    const dueDateObj = new Date(dueDate);
    const diffTime = dueDateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <div className="text-sm text-neutral-500">Submitted</div>;
    } else if (diffDays === 0) {
      return <div className="text-sm text-error font-medium">Due Today</div>;
    } else if (diffDays === 1) {
      return <div className="text-sm text-error font-medium">Due Tomorrow</div>;
    } else if (diffDays <= 3) {
      return <div className="text-sm text-warning font-medium">{diffDays} days left</div>;
    } else {
      return <div className="text-sm text-neutral-500">{diffDays} days left</div>;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-100">
      <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
        <h2 className="text-lg font-medium font-heading text-neutral-700">
          {viewOnly ? 'Recent Assignments' : 'Assignments'}
        </h2>
        {viewOnly && (
          <Link href="/assignments" className="text-sm font-medium text-primary hover:text-primary-dark">
            View All
          </Link>
        )}
      </div>
      
      <div className="overflow-x-auto">
        {assignments.length === 0 ? (
          <div className="p-6 text-center text-neutral-500">
            No assignments available
          </div>
        ) : (
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Assignment
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Course
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-neutral-50 transition-all">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-700">{assignment.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-500">{assignment.subject?.name || `Subject ${assignment.subjectId}`}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDueDateDisplay(assignment.dueDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className={`bg-${getStatusColor(assignment.submission?.status || 'not_started')} bg-opacity-10 text-${getStatusColor(assignment.submission?.status || 'not_started')} border-0`}>
                      {getStatusText(assignment)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/assignments/${assignment.id}`} 
                      className="text-primary hover:text-primary-dark"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AssignmentList;
