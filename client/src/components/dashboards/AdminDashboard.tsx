import React, { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import StatusCard from '@/components/cards/StatusCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, GraduationCap, MessageSquare, Loader2, ClipboardList, AlertCircle, Clock, CheckCircle, PauseCircle } from 'lucide-react';
import { Link } from 'wouter';
import { User, Request } from '@shared/schema';

// Интерфейс для задачи (Task)
interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'new' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  clientId: string;
  executorId: string;
  createdAt: string;
  updatedAt: string;
}
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import DashboardSkeleton from './DashboardSkeleton';
import ErrorAlert from './ErrorAlert';

const AdminDashboard = () => {
  const { t } = useTranslation();

  // Get all users with refetch on window focus and interval
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<User[]>({
    queryKey: ['/api/users'],
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get pending requests
  const {
    isLoading: isRequestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useQuery<Request[]>({
    queryKey: ['/api/requests'],
  });

  // Get all tasks
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refresh every 30 seconds
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
  // Рассчитываем статистику задач
  const taskStats = useMemo(() => {
    const totalTasks = tasks.length;
    const newTasks = tasks.filter(t => t.status === 'new').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const onHoldTasks = tasks.filter(t => t.status === 'on_hold').length;

    // Расчет задач с высоким приоритетом
    const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;

    // Расчет просроченных задач (если дата выполнения прошла, а задача не выполнена)
    const overdueTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      if (t.status === 'completed') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < new Date();
    }).length;

    return {
      total: totalTasks,
      new: newTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      onHold: onHoldTasks,
      highPriority: highPriorityTasks,
      overdue: overdueTasks
    };
  }, [tasks]);

  // Sort users by creation date (newest first)

  // Get the 5 most recently added users

  const isLoading =
    isLoadingUsers ||
    isRequestsLoading ||
    isLoadingTasks;

  const error = usersError || requestsError || tasksError;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    const handleRetry = () => {
      refetchUsers();
      refetchRequests();
      refetchTasks();
    };
    return <ErrorAlert error={error} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      {/* Удаляем тестовый элемент, так как теперь есть глобальный топбар */}
      {/* User and Task Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title={t('users.roles.students')}
          value={userStats.studentCount.toString()}
          icon={<GraduationCap className="h-6 w-6" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-white"
        />

        <StatusCard
          title={t('users.roles.teachers')}
          value={userStats.teacherCount.toString()}
          icon={<Briefcase className="h-6 w-6" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-white"
        />

        <StatusCard
          title={t('task.total')}
          value={taskStats.total.toString()}
          icon={<ClipboardList className="h-6 w-6" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-white"
        />

        <StatusCard
          title={t('task.completed')}
          value={taskStats.completed.toString()}
          icon={<CheckCircle className="h-6 w-6" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-white"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Tasks Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-heading">{t('dashboard.myTasks')}</CardTitle>
                <CardDescription>{t('task.relevantTasksDescription', 'Priority tasks requiring your attention')}</CardDescription>
              </div>
              <Link href="/tasks" className="text-sm font-medium text-primary hover:text-primary-dark">
                {t('common.viewAll')}
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {isLoadingTasks ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">
                    {t('task.no_tasks_found')}
                  </div>
                ) : (
                  tasks
                    .filter(task => ['new', 'in_progress'].includes(task.status))
                    .sort((a, b) => {
                      // Сначала сортируем по приоритету (high, medium, low)
                      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                      const priorityDiff = priorityOrder[a.priority as string] - priorityOrder[b.priority as string];

                      // Если приоритеты одинаковые, сортируем по дате выполнения
                      if (priorityDiff === 0) {
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      }

                      return priorityDiff;
                    })
                    .slice(0, 6)
                    .map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800 hover:border-primary dark:hover:border-primary shadow-sm hover:shadow mb-2">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${task.priority === 'high'
                            ? 'bg-red-100/70 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : task.priority === 'medium'
                              ? 'bg-orange-100/70 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-green-100/70 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {task.status === 'new' ? (
                              <AlertCircle className="h-5 w-5" />
                            ) : task.status === 'in_progress' ? (
                              <Clock className="h-5 w-5" />
                            ) : (
                              <CheckCircle className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{task.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs">{task.description}</p>
                            {task.dueDate && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {t('task.due_date')}: {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`capitalize ${task.status === 'new'
                          ? 'bg-blue-100/70 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800'
                          : task.status === 'in_progress'
                            ? 'bg-amber-100/70 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-green-100/70 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800'
                          }`}>
                          {t(`task.status.${task.status}`)}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
              <div className="mt-4 text-center">
                <Link href="/tasks">
                  <Button variant="outline" className="cursor-pointer">
                    {t('common.taskManager')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          {/* Task Manager Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">
                <div className="flex justify-between items-center">
                  <span>{t('common.taskManager')}</span>
                  <Link href="/tasks" className="text-sm font-normal text-primary hover:underline">
                    {t('common.viewAll')}
                  </Link>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('task.status.new')}</div>
                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.new}</div>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('task.status.in_progress')}</div>
                        <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.inProgress}</div>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('task.status.completed')}</div>
                        <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.completed}</div>
                    </div>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('task.status.on_hold')}</div>
                        <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                          <PauseCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.onHold}</div>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <Link href="/tasks">
                      <Button className="w-full">
                        {t('common.taskManager')}
                      </Button>
                    </Link>
                  </div>
                </>
              )}
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
                {/*
                <div className="w-full">
                  <Link href="/admin/imported-files" className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <FileText className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">{t('schedule.import.fileManager')}</span>
                  </Link>
                </div>
                */}

                {/* Users */}
                {/*
                <div className="w-full">
                  <Link href="/users" className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <Users className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">{t('common.users')}</span>
                  </Link>
                </div>
                */}

                {/* Requests */}
                {/*
                <div className="w-full">
                  <Link href="/requests" className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/10 transition-colors p-4 flex flex-col items-center justify-center gap-2 h-full cursor-pointer">
                    <FilePlus className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium">{t('requests.title')}</span>
                  </Link>
                </div>
                */}

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