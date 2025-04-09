import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import AssignmentList from '@/components/assignments/AssignmentList';
import ClassSchedule from '@/components/schedule/ClassSchedule';
import NotificationList from '@/components/notifications/NotificationList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart2, Book, Calendar as CalendarIcon, Clock, 
  AlertCircle, BookOpen, FileText, Bell 
} from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { calculateGPA } from '@/lib/utils';
import { Assignment, Notification, Request, ScheduleItem, Grade, Submission } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

// Extend Assignment type to include submission info
interface AssignmentWithSubmission extends Assignment {
  submission?: Submission;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // Get student assignments
  const { data: assignments = [] } = useQuery<AssignmentWithSubmission[]>({
    queryKey: ['/api/assignments/student/' + user?.id],
  });
  
  // Get student grades
  const { data: grades = [] } = useQuery<Grade[]>({
    queryKey: ['/api/grades/student/' + user?.id],
  });
  
  // Get schedule
  const { data: scheduleItems = [] } = useQuery<(ScheduleItem & { subject: { name: string } })[]>({
    queryKey: ['/api/schedule/student/' + user?.id],
  });
  
  // Get requests
  const { data: requests = [] } = useQuery<Request[]>({
    queryKey: ['/api/requests/student/' + user?.id],
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
  
  // Calculate GPA
  const gpa = calculateGPA(grades);
  
  // Get upcoming assignments that haven't been completed
  const upcomingAssignments = assignments
    .filter(assignment => new Date(assignment.dueDate) >= new Date())
    .filter(assignment => !assignment.submission || 
           (assignment.submission.status !== 'completed' && assignment.submission.status !== 'graded'))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);
  
  // Get today's and tomorrow's schedule
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  
  const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const tomorrowDayOfWeek = tomorrow.getDay();
  
  const todaySchedule = scheduleItems.filter(item => item.dayOfWeek === todayDayOfWeek);
  const tomorrowSchedule = scheduleItems.filter(item => item.dayOfWeek === tomorrowDayOfWeek);
  
  // Get nearest class
  const nearestClass = [...todaySchedule, ...tomorrowSchedule].sort((a, b) => {
    const aTime = new Date();
    const bTime = new Date();
    const [aHours, aMinutes] = a.startTime.split(':').map(Number);
    const [bHours, bMinutes] = b.startTime.split(':').map(Number);
    
    aTime.setHours(aHours, aMinutes);
    bTime.setHours(bHours, bMinutes);
    
    if (a.dayOfWeek !== todayDayOfWeek) aTime.setDate(aTime.getDate() + 1);
    if (b.dayOfWeek !== todayDayOfWeek) bTime.setDate(bTime.getDate() + 1);
    
    return aTime.getTime() - bTime.getTime();
  })[0];
  
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
  
  // Calculate attendance percentage (dummy for now)
  const attendancePercentage = 94;
  
  // Calculate completion rate of assignments
  const completedTasks = assignments.filter(a => 
    a.submission && (a.submission.status === 'completed' || a.submission.status === 'graded')
  ).length;
  const completionRate = Math.round((completedTasks / Math.max(assignments.length, 1)) * 100);
  
  return (
    <div className="space-y-6">
      {/* Alert for important reminders */}
      {upcomingAssignments.length > 0 && new Date(upcomingAssignments[0].dueDate).getTime() - new Date().getTime() < 1000 * 60 * 60 * 24 && (
        <div className="bg-destructive bg-opacity-10 border-l-4 border-destructive rounded-r-lg p-4 flex items-start">
          <AlertCircle className="h-6 w-6 text-destructive mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-destructive">{t('dashboard.student.importantReminder', 'Важное напоминание')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('dashboard.student.assignmentDueSoon', 'Срок сдачи задания "{{title}}" истекает скоро', {
                title: upcomingAssignments[0].title
              })}
            </p>
            <div className="mt-2">
              <Link href={`/assignments/${upcomingAssignments[0].id}`} className="text-sm font-medium text-destructive hover:underline">
                {t('assignments.view', 'Посмотреть задание')}
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nearest Class */}
        <StatusCard
          title={t('dashboard.student.nextClass', 'Ближайшее занятие')}
          value={nearestClass 
            ? nearestClass.subject.name 
            : t('dashboard.student.noClasses', 'Нет занятий')}
          change={nearestClass ? {
            value: nearestClass.dayOfWeek === todayDayOfWeek
              ? t('dashboard.student.today', 'Сегодня, {{time}}', { time: nearestClass.startTime.slice(0, 5) })
              : t('dashboard.student.tomorrow', 'Завтра, {{time}}', { time: nearestClass.startTime.slice(0, 5) }),
            type: "neutral"
          } : undefined}
          icon={<BookOpen className="h-6 w-6" />}
        />
        
        {/* Attendance */}
        <StatusCard
          title={t('dashboard.student.attendance', 'Посещаемость')}
          value={`${attendancePercentage}%`}
          change={{
            value: t('dashboard.student.attendanceRate', 'Ваш показатель посещаемости'),
            type: attendancePercentage > 90 ? "increase" : attendancePercentage > 75 ? "neutral" : "decrease"
          }}
          icon={<Clock className="h-6 w-6" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
        />
        
        {/* Completed Tasks */}
        <StatusCard
          title={t('dashboard.student.completedTasks', 'Выполненные задания')}
          value={`${completedTasks}/${assignments.length}`}
          change={{
            value: t('common.percentage', '{{percentage}}%', { percentage: completionRate }),
            type: completionRate > 75 ? "increase" : completionRate > 50 ? "neutral" : "decrease"
          }}
          icon={<Book className="h-6 w-6" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-primary"
        />
        
        {/* Pending Requests */}
        <StatusCard
          title={t('requests.pending', 'Активные заявки')}
          value={requests.filter(r => r.status === 'pending').length.toString()}
          change={{
            value: t('requests.statuses.pending', 'В ожидании рассмотрения'),
            type: "neutral"
          }}
          icon={<FileText className="h-6 w-6" />}
          iconBgColor="bg-warning bg-opacity-10"
          iconColor="text-warning"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.student.nextClass', 'Ближайшее занятие')}</CardTitle>
              <CardDescription>
                {t('dashboard.student.scheduledToday', todaySchedule.length === 1 
                  ? 'У вас запланировано {{count}} занятие сегодня' 
                  : todaySchedule.length > 1 && todaySchedule.length < 5 
                    ? 'У вас запланировано {{count}} занятия сегодня'
                    : 'У вас запланировано {{count}} занятий сегодня', 
                  { count: todaySchedule.length }
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClassSchedule scheduleItems={todaySchedule.length > 0 ? todaySchedule : tomorrowSchedule} />
            </CardContent>
          </Card>
          
          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.student.pendingAssignments', 'Текущие задания')}</CardTitle>
              <CardDescription>{t('dashboard.student.dueSoon', 'Задания со сроком сдачи скоро')}</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('assignments.noPending', 'У вас нет ожидающих заданий')}
                </div>
              ) : (
                <AssignmentList assignments={upcomingAssignments} viewOnly />
              )}
            </CardContent>
          </Card>
          
          {/* Request History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>{t('dashboard.student.requestHistory', 'История заявок')}</CardTitle>
                <CardDescription>{t('dashboard.student.latestRequests', 'Последние заявки')}</CardDescription>
              </div>
              <Link href="/requests" className="text-sm font-medium text-primary hover:text-primary-dark">
                {t('common.actions.view', 'Просмотр')}
              </Link>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('requests.noRequests', 'У вас нет заявок')}
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.slice(0, 3).map(request => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium">{request.type}</h4>
                        <Badge variant={
                          request.status === 'approved' ? 'default' : 
                          request.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {t(`requests.statuses.${request.status}`, request.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString('ru-RU') : ''}
                      </p>
                      <p className="text-xs text-foreground mt-2 line-clamp-2">{request.description}</p>
                      <div className="mt-2">
                        <Link href={`/requests/${request.id}`} className="text-xs text-primary hover:underline">
                          {t('common.actions.details', 'Подробнее')}
                        </Link>
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
          
          {/* Quick Links */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">{t('dashboard.quickActions', 'Быстрые действия')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/assignments">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <Book className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium">{t('assignments.title', 'Задания')}</span>
                  </div>
                </Link>
                
                <Link href="/schedule">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <CalendarIcon className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium">{t('schedule.title', 'Расписание')}</span>
                  </div>
                </Link>
                
                <Link href="/requests/new">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium">{t('requests.add', 'Создать заявку')}</span>
                  </div>
                </Link>
                
                <Link href="/grades">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
                    <BarChart2 className="h-6 w-6 mb-2" />
                    <span className="text-xs font-medium">{t('grades.title', 'Оценки')}</span>
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

export default StudentDashboard;
