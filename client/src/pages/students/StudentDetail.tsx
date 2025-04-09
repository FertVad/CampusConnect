import React from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User } from 'lucide-react';
import StudentCard, { Student } from '@/components/students/StudentCard';

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
  phone?: string;
}

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  status: 'new' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: string;
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const userId = parseInt(id);

  // Fetch user data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}`);
      return response.json() as Promise<UserData>;
    },
    enabled: !!userId && !isNaN(userId)
  });

  // Fetch notifications for the user
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/users', userId, 'notifications'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/notifications`);
      return response.json() as Promise<Notification[]>;
    },
    enabled: !!userId && !isNaN(userId)
  });

  // Fetch tasks for the user
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/users', userId, 'tasks'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/tasks`);
      return response.json() as Promise<Task[]>;
    },
    enabled: !!userId && !isNaN(userId) && userData?.role === 'student'
  });

  // Helper to format date from string
  const formatDateString = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  // Convert API data to StudentCard props
  const mapToStudentProps = (): Student | null => {
    if (!userData) return null;

    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    // Count tasks by status
    const openTasks = tasks.filter(t => t.status === 'new' || t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    return {
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      // Demo data for now, replace with real API data later
      group: 'ИС-101',
      major: 'Информатика и ВТ',
      course: 3,
      lastLogin: userData.createdAt, // Using createdAt as placeholder
      upcomingLesson: 'Математика в 15:00',
      tasksOpen: openTasks,
      tasksDone: completedTasks,
      unreadNotifications: unreadCount,
      averageGrade: 85, // Demo data
      missedClasses: 2, // Demo data
      note: 'Активный студент, участвует в общественной деятельности.',
    };
  };

  // Loading state
  if (userLoading || notificationsLoading || tasksLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-60" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (userError || !userData) {
    return (
      <div className="container mx-auto py-6">
        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">
              {t('errors.userNotFound', 'Пользователь не найден')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              {t('errors.userNotFoundDescription', 'Пользователь с указанным ID не существует или у вас нет прав для его просмотра.')}
            </p>
            <Button asChild className="mt-4">
              <Link href="/users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('actions.backToUsers', 'Вернуться к списку пользователей')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-student user warning
  if (userData.role !== 'student') {
    return (
      <div className="container mx-auto py-6">
        <Card className="bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-700">
              {t('warnings.notStudent', 'Не студенческий профиль')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-600">
              {t('warnings.notStudentDescription', 'Данный пользователь не является студентом. Карточка студента доступна только для пользователей с ролью "student".')}
            </p>
            <div className="mt-4 flex flex-col md:flex-row md:items-center gap-4">
              <Button asChild variant="outline">
                <Link href="/users">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('actions.backToUsers', 'Вернуться к списку пользователей')}
                </Link>
              </Button>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  {userData.firstName} {userData.lastName} ({userData.role})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studentData = mapToStudentProps();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('actions.backToUsers', 'Вернуться к списку пользователей')}
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">
          {t('student.profile.title', 'Профиль студента')}
        </h2>
      </div>

      {studentData && (
        <StudentCard student={studentData} />
      )}

      {/* Дополнительные карточки с информацией можно добавить здесь */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Последние уведомления */}
        <Card>
          <CardHeader>
            <CardTitle>{t('student.recentNotifications', 'Последние уведомления')}</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground">{t('notifications.empty', 'Нет уведомлений')}</p>
            ) : (
              <ul className="space-y-3">
                {notifications.slice(0, 5).map(notification => (
                  <li key={notification.id} className={`p-3 rounded-md ${notification.isRead ? 'bg-secondary/30' : 'bg-primary/10'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateString(notification.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Задачи */}
        <Card>
          <CardHeader>
            <CardTitle>{t('student.tasks', 'Задачи')}</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-muted-foreground">{t('tasks.empty', 'Нет задач')}</p>
            ) : (
              <ul className="space-y-3">
                {tasks.slice(0, 5).map(task => (
                  <li key={task.id} className="p-3 rounded-md bg-secondary/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'on_hold' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'in_progress' ? 'В процессе' :
                           task.status === 'completed' ? 'Выполнено' :
                           task.status === 'on_hold' ? 'На паузе' : 'Новая'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateString(task.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}