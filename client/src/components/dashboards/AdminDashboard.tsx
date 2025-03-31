import React, { useContext } from 'react';

import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import NotificationList from '@/components/notifications/NotificationList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart2, BookOpen, FilePlus, Users } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Notification, User, Request } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

const AdminDashboard = () => {
  const { user } = useAuth();
  
  
  // Get all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Get all subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['/api/subjects'],
  });
  
  // Get notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: [`/api/notifications/user/${user?.id}`],
  });
  
  // Get pending requests
  const { data: requests = [] } = useQuery<Request[]>({
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
  
  // Count users by role
  const studentCount = users.filter(u => u.role === 'student').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  
  // Count pending requests
  const pendingRequests = requests.filter(r => r.status === 'pending');
  
  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Students"
          value={studentCount.toString()}
          icon={<Users className="h-6 w-6" />}
        />
        
        <StatusCard
          title="Teachers"
          value={teacherCount.toString()}
          icon={<Users className="h-6 w-6" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
        />
        
        <StatusCard
          title="Courses"
          value={subjects.length.toString()}
          icon={<BookOpen className="h-6 w-6" />}
          iconBgColor="bg-accent bg-opacity-10"
          iconColor="text-accent"
        />
        
        <StatusCard
          title="Pending Requests"
          value={pendingRequests.length.toString()}
          icon={<FilePlus className="h-6 w-6" />}
          iconBgColor="bg-warning bg-opacity-10"
          iconColor="text-warning"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity / Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex flex-col items-center justify-center">
                <BarChart2 className="h-16 w-16 text-neutral-300 mb-4" />
                <p className="text-neutral-500 text-center">Analytics dashboard will be available here</p>
                <p className="text-neutral-400 text-sm text-center mt-1">Summary of student performance, attendance, and system usage</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-heading">Recently Added Users</CardTitle>
              <Link href="/users" className="text-sm font-medium text-primary hover:text-primary-dark">
                Manage Users
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">
                    No users found
                  </div>
                ) : (
                  users
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-light bg-opacity-20 flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-primary">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-700">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-neutral-500">{user.email}</p>
                          </div>
                        </div>
                        <Badge className={`capitalize ${user.role === 'admin' ? 'bg-primary' : user.role === 'teacher' ? 'bg-secondary' : 'bg-accent'}`}>
                          {user.role}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
              <div className="mt-4 text-center">
                <Button asChild variant="outline">
                  <Link href="/users">
                    View All Users
                  </Link>
                </Button>
              </div>
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
              {pendingRequests.length === 0 ? (
                <div className="text-center py-4 text-neutral-500">
                  No pending requests
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 4).map(request => (
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Links */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium font-heading mb-4">Administrative Tools</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/users">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <Users className="h-6 w-6 text-primary mb-2" />
                    <span className="text-xs font-medium text-neutral-700">User Management</span>
                  </a>
                </Link>
                
                <Link href="/schedule">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium text-neutral-700">Schedule</span>
                  </a>
                </Link>
                
                <Link href="/requests">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <FilePlus className="h-6 w-6 text-accent mb-2" />
                    <span className="text-xs font-medium text-neutral-700">Requests</span>
                  </a>
                </Link>
                
                <Link href="/invoices">
                  <a className="flex flex-col items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-medium text-neutral-700">Documents</span>
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

export default AdminDashboard;
