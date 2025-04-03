import React from 'react';

import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FilePlus, Users, FileText, MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { User, Request } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import ActivityFeed from '@/components/activity/ActivityFeed';

const AdminDashboard = () => {
  const { t } = useTranslation();
  
  // Get all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Get all subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects'],
  });
  
  // Get pending requests
  const { data: requests = [] } = useQuery<Request[]>({
    queryKey: ['/api/requests'],
  });
  
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
        {/* Activity Feed space (2/3 width) - kept empty for now */}
        <div className="lg:col-span-2 space-y-6">
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
                    .sort((a, b) => {
                      if (b.createdAt && a.createdAt) {
                        return new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime();
                      }
                      return 0;
                    })
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
                <Link href="/users">
                  <span className="inline-block">
                    <Button variant="outline">
                      View All Users
                    </Button>
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          {/* Activity Feed */}
          <ActivityFeed />
        </div>
        
        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-3 p-3">
                {/* Files */}
                <Link href="/imported-files" className="w-full">
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <FileText className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">📁 {t('schedule.importedFiles')}</span>
                  </div>
                </Link>
                
                {/* Users */}
                <Link href="/users" className="w-full">
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <Users className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">👥 {t('common.users')}</span>
                  </div>
                </Link>
                
                {/* Requests */}
                <Link href="/requests" className="w-full">
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <FilePlus className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">📄 {t('requests.title')}</span>
                  </div>
                </Link>
                
                {/* Chat */}
                <Link href="/chat" className="w-full">
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">💬 {t('chat.title')}</span>
                  </div>
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
