import React, { useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FilePlus, Users, UserCircle, Briefcase, GraduationCap, FileText, MessageSquare, Loader2, ClipboardList } from 'lucide-react';
import { Link } from 'wouter';
import { User, Request } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import ActivityFeed from '@/components/activity/ActivityFeed';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Get all users with refetch on window focus and interval
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Get all subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects'],
  });
  
  // Get pending requests
  const { data: requests = [] } = useQuery<Request[]>({
    queryKey: ['/api/requests'],
  });
  
  // Calculate user statistics using useMemo for performance
  const userStats = useMemo(() => {
    const adminCount = users.filter(u => u.role === 'admin').length;
    const teacherCount = users.filter(u => u.role === 'teacher').length;
    const studentCount = users.filter(u => u.role === 'student').length;
    
    return {
      total: users.length,
      adminCount,
      teacherCount,
      studentCount
    };
  }, [users]);
  
  // Count pending requests
  const pendingRequests = requests.filter(r => r.status === 'pending');
  
  // Sort users by creation date (newest first)
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (b.createdAt && a.createdAt) {
        return new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime();
      }
      return 0;
    });
  }, [users]);
  
  // Get the 5 most recently added users
  const recentUsers = sortedUsers.slice(0, 5);
  
  // Get role badge styles
  const getRoleBadgeStyles = (role: string) => {
    switch(role) {
      case 'admin':
        return 'bg-primary';
      case 'teacher':
        return 'bg-secondary';
      case 'student':
        return 'bg-accent';
      default:
        return 'bg-neutral-500';
    }
  };
  
  // Get role icon
  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'admin':
        return <UserCircle className="h-6 w-6" />;
      case 'teacher':
        return <Briefcase className="h-6 w-6" />;
      case 'student':
        return <GraduationCap className="h-6 w-6" />;
      default:
        return <Users className="h-6 w-6" />;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* User Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title={t('users.roles.students')}
          value={userStats.studentCount.toString()}
          icon={<GraduationCap className="h-6 w-6" />}
          iconBgColor="bg-accent bg-opacity-10"
          iconColor="text-accent"
        />
        
        <StatusCard
          title={t('users.roles.teachers')}
          value={userStats.teacherCount.toString()}
          icon={<Briefcase className="h-6 w-6" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
        />
        
        <StatusCard
          title={t('users.roles.admins')}
          value={userStats.adminCount.toString()}
          icon={<UserCircle className="h-6 w-6" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-primary"
        />
        
        <StatusCard
          title={t('common.total')}
          value={userStats.total.toString()}
          icon={<Users className="h-6 w-6" />}
          iconBgColor="bg-info bg-opacity-10"
          iconColor="text-info"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-heading">{t('users.recentlyAdded')}</CardTitle>
                <CardDescription>{t('users.recentUsersDescription')}</CardDescription>
              </div>
              <Link href="/users" className="text-sm font-medium text-primary hover:text-primary-dark">
                {t('common.manageUsers')}
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {isLoadingUsers ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">
                    {t('users.noUsersFound')}
                  </div>
                ) : (
                  recentUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-light bg-opacity-20 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-primary">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-700">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                          {user.createdAt && (
                            <p className="text-xs text-neutral-400">
                              {t('common.added')} {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={`capitalize ${getRoleBadgeStyles(user.role)}`}>
                        {t(`users.roles.${user.role}`)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 text-center">
                <Link href="/users">
                  <Button variant="outline" className="cursor-pointer">
                    {t('common.viewAllUsers')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          {/* Activity Feed */}
          <ActivityFeed />
        </div>
        
        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          {/* Task Manager Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">{t('common.taskManager')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ClipboardList className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Управляйте задачами, назначайте их студентам и отслеживайте прогресс выполнения
                </p>
                <Link href="/tasks">
                  <Button className="w-full">
                    {t('common.taskManager')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-3 p-3">
                {/* Files */}
                <div className="w-full">
                  <Link href="/admin/imported-files" className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <FileText className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">{t('schedule.import.fileManager')}</span>
                  </Link>
                </div>
                
                {/* Users */}
                <div className="w-full">
                  <Link href="/users" className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <Users className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">{t('common.users')}</span>
                  </Link>
                </div>
                
                {/* Requests */}
                <div className="w-full">
                  <Link href="/requests" className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <FilePlus className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">{t('requests.title')}</span>
                  </Link>
                </div>
                
                {/* Chat */}
                <div className="w-full">
                  <Link href="/chat" className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">{t('chat.title')}</span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;