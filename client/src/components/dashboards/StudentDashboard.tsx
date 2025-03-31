import React, { useContext } from 'react';

import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import AssignmentList from '@/components/assignments/AssignmentList';
import ClassSchedule from '@/components/schedule/ClassSchedule';
import Calendar from '@/components/calendar/Calendar';
import NotificationList from '@/components/notifications/NotificationList';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart2, Book, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Link } from 'wouter';
import { calculateGPA } from '@/lib/utils';
import { Assignment, Notification } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

const StudentDashboard = () => {
  const { user } = useAuth();
  
  
  // Get student assignments
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['/api/assignments/student/' + user?.id],
  });
  
  // Get student grades
  const { data: grades = [] } = useQuery({
    queryKey: ['/api/grades/student/' + user?.id],
  });
  
  // Get schedule
  const { data: scheduleItems = [] } = useQuery({
    queryKey: ['/api/schedule/student/' + user?.id],
  });
  
  // Get notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/user/' + user?.id],
  });
  
  // Calculate GPA
  const gpa = calculateGPA(grades);
  
  // Get upcoming assignments
  const upcomingAssignments = assignments
    .filter(assignment => new Date(assignment.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);
  
  // Mark notification as read
  const handleMarkAsRead = async (id: number) => {
    await apiRequest('PUT', `/api/notifications/${id}/read`, {});
  };
  
  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const promises = notifications
      .filter(notification => !notification.isRead)
      .map(notification => handleMarkAsRead(notification.id));
    
    await Promise.all(promises);
  };
  
  return (
    <div className="space-y-6">
      {/* Alert for important reminders */}
      {upcomingAssignments.length > 0 && new Date(upcomingAssignments[0].dueDate).getTime() - new Date().getTime() < 1000 * 60 * 60 * 24 && (
        <div className="bg-error bg-opacity-10 border-l-4 border-error rounded-r-lg p-4 flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-error">Important Reminder</h3>
            <p className="text-sm text-neutral-600 mt-1">Your {upcomingAssignments[0].title} assignment is due soon.</p>
            <div className="mt-2">
              <Link href={`/assignments/${upcomingAssignments[0].id}`} className="text-sm font-medium text-error hover:text-error-dark">
                View Assignment
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="GPA"
          value={gpa.toString()}
          change={{
            value: "Current semester",
            type: "increase"
          }}
          icon={<BarChart2 className="h-6 w-6" />}
        />
        
        <StatusCard
          title="Attendance"
          value="94%"
          change={{
            value: "Down 2% from last month",
            type: "decrease"
          }}
          icon={<Clock className="h-6 w-6" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
        />
        
        <StatusCard
          title="Completed Tasks"
          value={`${assignments.filter(a => a.submission?.status === 'completed' || a.submission?.status === 'graded').length}/${assignments.length}`}
          change={{
            value: `${Math.round((assignments.filter(a => a.submission?.status === 'completed' || a.submission?.status === 'graded').length / Math.max(assignments.length, 1)) * 100)}% completion rate`,
            type: "increase"
          }}
          icon={<Book className="h-6 w-6" />}
          iconBgColor="bg-accent bg-opacity-10"
          iconColor="text-accent"
        />
        
        <StatusCard
          title="Balance Due"
          value="$750"
          change={{
            value: "Due in 15 days",
            type: "neutral"
          }}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          iconBgColor="bg-error bg-opacity-10"
          iconColor="text-error"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <ClassSchedule scheduleItems={scheduleItems} />
          <AssignmentList assignments={upcomingAssignments} viewOnly />
        </div>
        
        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          <Calendar
            events={assignments.map(assignment => ({
              date: new Date(assignment.dueDate),
              type: new Date(assignment.dueDate) < new Date() ? 'error' : 'primary'
            }))}
          />
          
          <NotificationList
            notifications={notifications.slice(0, 5)}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onViewAll={() => {/* In a real application, this would navigate to notifications page */}}
          />
          
          {/* Quick Links */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium font-heading mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/assignments">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-xs font-medium text-neutral-700">Assignments</span>
                  </a>
                </Link>
                
                <Link href="/schedule">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <CalendarIcon className="h-6 w-6 text-secondary mb-2" />
                    <span className="text-xs font-medium text-neutral-700">Schedule</span>
                  </a>
                </Link>
                
                <Link href="/chat">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-medium text-neutral-700">Chat</span>
                  </a>
                </Link>
                
                <Link href="/invoices">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-medium text-neutral-700">Invoices</span>
                  </a>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
