import React, { useContext } from 'react';
import { UserContext } from '@/main';
import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import AssignmentList from '@/components/assignments/AssignmentList';
import ClassSchedule from '@/components/schedule/ClassSchedule';
import NotificationList from '@/components/notifications/NotificationList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart2, BookOpen, Calendar, Users } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Notification, Assignment, User } from '@shared/schema';

const TeacherDashboard = () => {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  
  // Get teacher's classes/subjects
  const { data: subjects = [] } = useQuery({
    queryKey: [`/api/subjects/teacher/${user?.id}`],
  });
  
  // Get teacher's schedule
  const { data: scheduleItems = [] } = useQuery({
    queryKey: [`/api/schedule/teacher/${user?.id}`],
  });
  
  // Get teacher's assignments
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: [`/api/assignments/teacher/${user?.id}`],
  });
  
  // Get all students for teacher's classes
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    select: (data) => data.filter(user => user.role === 'student'),
  });
  
  // Get notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: [`/api/notifications/user/${user?.id}`],
  });
  
  // Get pending requests (that teachers should handle)
  const { data: requests = [] } = useQuery({
    queryKey: ['/api/requests'],
  });
  
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
  
  // Get upcoming assignments
  const upcomingAssignments = assignments
    .filter(assignment => new Date(assignment.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);
  
  // Get pending submissions count
  const pendingSubmissionsCount = 12; // This would come from an API in a real implementation
  
  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Classes"
          value={subjects.length.toString()}
          icon={<BookOpen className="h-6 w-6" />}
        />
        
        <StatusCard
          title="Students"
          value={students.length.toString()}
          icon={<Users className="h-6 w-6" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
        />
        
        <StatusCard
          title="Pending Submissions"
          value={pendingSubmissionsCount.toString()}
          change={{
            value: `${Math.round(pendingSubmissionsCount / Math.max(assignments.length, 1) * 100)}% of total`,
            type: "neutral"
          }}
          icon={<BarChart2 className="h-6 w-6" />}
          iconBgColor="bg-accent bg-opacity-10"
          iconColor="text-accent"
        />
        
        <StatusCard
          title="Pending Requests"
          value={requests.filter(r => r.status === 'pending').length.toString()}
          icon={<Calendar className="h-6 w-6" />}
          iconBgColor="bg-warning bg-opacity-10"
          iconColor="text-warning"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule */}
          <ClassSchedule scheduleItems={scheduleItems} />
          
          {/* Assignments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-heading">Active Assignments</CardTitle>
              <Link href="/assignments" className="text-sm font-medium text-primary hover:text-primary-dark">
                View All
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  No active assignments
                </div>
              ) : (
                <AssignmentList assignments={upcomingAssignments} viewOnly />
              )}
            </CardContent>
          </Card>
          
          {/* Students */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-heading">Your Students</CardTitle>
              <Link href="/users" className="text-sm font-medium text-primary hover:text-primary-dark">
                View All
              </Link>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  No students assigned to your classes
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {students.slice(0, 6).map(student => (
                    <div key={student.id} className="flex items-center p-3 bg-neutral-50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-primary-light bg-opacity-20 flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-primary">
                          {student.firstName[0]}{student.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-700">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          {/* Notifications */}
          <NotificationList
            notifications={notifications.slice(0, 5)}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onViewAll={() => {/* In a real application, this would navigate to notifications page */}}
          />
          
          {/* Pending Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-heading">Pending Requests</CardTitle>
              <Link href="/requests" className="text-sm font-medium text-primary hover:text-primary-dark">
                View All
              </Link>
            </CardHeader>
            <CardContent>
              {requests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-4 text-neutral-500">
                  No pending requests
                </div>
              ) : (
                <div className="space-y-3">
                  {requests
                    .filter(r => r.status === 'pending')
                    .slice(0, 3)
                    .map(request => (
                      <div key={request.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium">{request.type}</h4>
                          <Badge variant="outline" className="bg-warning bg-opacity-10 text-warning border-0">
                            Pending
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">From: Student ID {request.studentId}</p>
                        <p className="text-xs text-neutral-700 mt-2 line-clamp-2">{request.description}</p>
                        <div className="mt-2">
                          <Link href={`/requests#${request.id}`} className="text-xs text-primary">
                            Review Request
                          </Link>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
          
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
                
                <Link href="/grades">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <BarChart2 className="h-6 w-6 text-secondary mb-2" />
                    <span className="text-xs font-medium text-neutral-700">Grades</span>
                  </a>
                </Link>
                
                <Link href="/chat">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-xs font-medium text-neutral-700">Chat</span>
                  </a>
                </Link>
                
                <Link href="/schedule">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <Calendar className="h-6 w-6 text-error mb-2" />
                    <span className="text-xs font-medium text-neutral-700">Schedule</span>
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

export default TeacherDashboard;
