import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import AssignmentList from '@/components/assignments/AssignmentList';
import ClassSchedule from '@/components/schedule/ClassSchedule';
import NotificationList from '@/components/notifications/NotificationList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart2, BookOpen, Calendar, Users, 
  Clock, PenTool, FileText, MessageSquare, 
  Bell, CheckCircle, XCircle, AlertCircle,
  PlusCircle, FileType
} from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Notification, Assignment, User, Subject, Request } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // Get teacher's classes/subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: [`/api/subjects/teacher/${user?.id}`],
  });
  
  // Get teacher's schedule
  const { data: scheduleItems = [] } = useQuery<(ScheduleItem & { subject: { name: string } })[]>({
    queryKey: [`/api/schedule/teacher/${user?.id}`],
  });
  
  // Get teacher's assignments
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: [`/api/assignments/teacher/${user?.id}`],
  });
  
  // Get all students for teacher's classes
  const { data: allStudents = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    select: (data) => data.filter(user => user.role === 'student'),
  });
  
  // Get notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Данные считаются свежими в течение 2 минут
    gcTime: 10 * 60 * 1000, // Храним в кэше 10 минут
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchInterval: false // Не обновляем автоматически
  });
  
  // Get pending requests (that teachers should handle)
  const { data: requests = [] } = useQuery<Request[]>({
    queryKey: ['/api/requests'],
    select: (data) => data.filter(r => r.status === 'pending'),
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
  
  // Filter students based on activity (inactive for X days)
  const inactiveStudents = allStudents.slice(0, 3); // This would be filtered based on actual activity data
  
  // Get today's schedule
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todaySchedule = scheduleItems.filter(item => item.dayOfWeek === todayDayOfWeek);
  
  // Get pending submissions (dummy implementation for now)
  const pendingSubmissionsByAssignment = assignments.map(assignment => ({
    assignment,
    stats: {
      submitted: Math.floor(Math.random() * 10) + 1,
      notSubmitted: Math.floor(Math.random() * 10) + 1,
      needsGrading: Math.floor(Math.random() * 5),
    }
  })).slice(0, 3);
  
  // Calculate total pending submissions
  const totalPendingSubmissions = pendingSubmissionsByAssignment.reduce(
    (sum, item) => sum + item.stats.needsGrading, 0
  );
  
  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title={t('dashboard.teacher.classGroups', 'Список групп и предметов')}
          value={subjects.length.toString()}
          change={{
            value: t('dashboard.teacher.yourClasses', 'Ваши предметы'),
            type: "neutral"
          }}
          icon={<BookOpen className="h-6 w-6" />}
        />
        
        <StatusCard
          title={t('dashboard.teacher.totalStudents', 'Всего студентов')}
          value={allStudents.length.toString()}
          icon={<Users className="h-6 w-6" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
        />
        
        <StatusCard
          title={t('dashboard.teacher.pendingSubmissions', 'Ожидающие проверки работы')}
          value={totalPendingSubmissions.toString()}
          change={{
            value: t('dashboard.teacher.needGrading', '{{count}} заданий требуют оценки', { count: totalPendingSubmissions }),
            type: "neutral"
          }}
          icon={<PenTool className="h-6 w-6" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-primary"
        />
        
        <StatusCard
          title={t('dashboard.teacher.classesToday', 'Занятий сегодня')}
          value={todaySchedule.length.toString()}
          change={{
            value: t('common.time.today', 'Сегодня'),
            type: "neutral"
          }}
          icon={<Clock className="h-6 w-6" />}
          iconBgColor="bg-warning bg-opacity-10"
          iconColor="text-warning"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule for Today */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.teacher.schedule', 'Расписание занятий')}</CardTitle>
              <CardDescription>
                {t('dashboard.teacher.timetable', 'Ваше расписание преподавания на сегодня')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todaySchedule.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('schedule.noClassesToday', 'Сегодня у вас нет занятий')}
                </div>
              ) : (
                <ClassSchedule scheduleItems={todaySchedule} />
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" asChild>
                <Link href="/schedule">
                  {t('schedule.viewFull', 'Просмотреть полное расписание')}
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Assignments In Progress */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.teacher.grading', 'Задания в работе')}</CardTitle>
              <CardDescription>{t('assignments.status', 'Статус заданий по группам')}</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSubmissionsByAssignment.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('assignments.noActiveAssignments', 'У вас нет активных заданий')}
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSubmissionsByAssignment.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-medium">{item.assignment.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {t('assignments.dueDate', 'Срок сдачи: {{date}}', { 
                            date: new Date(item.assignment.dueDate).toLocaleDateString('ru-RU') 
                          })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center p-2 bg-muted rounded">
                          <CheckCircle className="h-4 w-4 text-success mb-1" />
                          <span className="text-sm font-medium">{item.stats.submitted}</span>
                          <span className="text-xs text-muted-foreground">{t('assignments.submitted', 'Сдано')}</span>
                        </div>
                        
                        <div className="flex flex-col items-center p-2 bg-muted rounded">
                          <XCircle className="h-4 w-4 text-destructive mb-1" />
                          <span className="text-sm font-medium">{item.stats.notSubmitted}</span>
                          <span className="text-xs text-muted-foreground">{t('assignments.notSubmitted', 'Не сдано')}</span>
                        </div>
                        
                        <div className="flex flex-col items-center p-2 bg-muted rounded">
                          <AlertCircle className="h-4 w-4 text-warning mb-1" />
                          <span className="text-sm font-medium">{item.stats.needsGrading}</span>
                          <span className="text-xs text-muted-foreground">{t('assignments.needsGrading', 'К проверке')}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <Link href={`/assignments/${item.assignment.id}`} className="text-xs text-primary hover:underline">
                          {t('assignments.viewDetails', 'Просмотреть детали')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href="/assignments">
                  {t('assignments.viewAll', 'Все задания')}
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/assignments/new">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('dashboard.teacher.assignNewTask', 'Назначить задание')}
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Student Activity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.teacher.studentActivity', 'Активность студентов')}</CardTitle>
              <CardDescription>{t('dashboard.teacher.studentInactivity', 'Студенты без активности')}</CardDescription>
            </CardHeader>
            <CardContent>
              {inactiveStudents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('dashboard.teacher.allActive', 'Все студенты активны')}
                </div>
              ) : (
                <div className="space-y-2">
                  {inactiveStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mr-3">
                          <span className="text-sm font-medium">
                            {student.firstName[0]}{student.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('dashboard.teacher.inactiveDays', '{{days}} дней без активности', { days: Math.floor(Math.random() * 10) + 3 })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/chat/${student.id}`}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {t('chat.contact', 'Связаться')}
                        </Link>
                      </Button>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>{t('dashboard.notifications', 'Уведомления')}</span>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationList
                notifications={notifications.slice(0, 5)}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onViewAll={() => {/* In a real application, this would navigate to notifications page */}}
              />
            </CardContent>
          </Card>
          
          {/* Pending Requests */}
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.pending', 'Активные заявки')}</CardTitle>
              <CardDescription>{t('dashboard.teacher.studentHelp', 'Студентам требуется помощь')}</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {t('requests.noPending', 'Нет активных заявок')}
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.slice(0, 3).map(request => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium">{
                          t(`requests.types.${request.type}`, request.type)
                        }</h4>
                        <Badge variant="outline" className="bg-warning bg-opacity-10 text-warning">
                          {t('requests.statuses.pending', 'В ожидании')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('requests.from', 'От: {{studentId}}', { studentId: request.studentId })}
                      </p>
                      <p className="text-xs mt-2 line-clamp-2">{request.description}</p>
                      <div className="mt-2">
                        <Link href={`/requests/${request.id}`} className="text-xs text-primary hover:underline">
                          {t('requests.review', 'Рассмотреть заявку')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/requests">
                  {t('requests.viewAll', 'Просмотреть все заявки')}
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions', 'Быстрые действия')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/assignments/new">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <FileType className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium text-center">{t('assignments.add', 'Добавить задание')}</span>
                  </div>
                </Link>
                
                <Link href="/grades">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <BarChart2 className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium text-center">{t('grades.title', 'Оценки')}</span>
                  </div>
                </Link>
                
                <Link href="/chat">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <MessageSquare className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium text-center">{t('chat.title', 'Чат')}</span>
                  </div>
                </Link>
                
                <Link href="/schedule">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <Calendar className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium text-center">{t('schedule.title', 'Расписание')}</span>
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

export default TeacherDashboard;
