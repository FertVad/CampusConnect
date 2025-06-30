import React, { Suspense } from 'react';
import { useParams, Link } from 'wouter';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User } from 'lucide-react';
import StudentCard from '@/components/students/StudentCard';
import useStudentDetail from '@/hooks/useStudentDetail';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const userId = id;
  const {
    userData,
    studentData,
    tasks,
    tasksLoading,
    notificationsLoading,
    userLoading,
    error: userError,
  } = useStudentDetail(id);

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

      {/* Дополнительные карточки с информацией */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Документы студента */}
        <Card>
          <CardHeader>
            <CardTitle>{t('student.documents', 'Документы')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Импортируем компонент документов напрямую */}
            <Suspense fallback={<div className="py-4 text-center text-muted-foreground">{t('common.loading', 'Загрузка...')}</div>}>
              <div key="documents-container">
                {(() => {
                  const DocumentsComponent = React.lazy(() => import('@/components/students/StudentDocuments'));
                  return <DocumentsComponent
                    documents={[]} // В будущем будем получать из API
                    isLoading={false}
                  />;
                })()}
              </div>
            </Suspense>
          </CardContent>
        </Card>

        {/* Задачи */}
        <Card>
          <CardHeader>
            <CardTitle>{t('student.tasks', 'Задачи')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Улучшенный компонент задач */}
            <Suspense fallback={<div className="py-4 text-center text-muted-foreground">{t('common.loading', 'Загрузка...')}</div>}>
              <div key="tasks-container">
                {(() => {
                  const TasksComponent = React.lazy(() => import('@/components/students/StudentTasks'));
                  return <TasksComponent 
                    userId={userId}
                    tasks={tasks.map(task => ({
                      ...task,
                      // Добавляем дополнительные поля, которые могут прийти из API
                      creatorName: 'Администратор', // Временно, в будущем получать из API
                      dueDate: task.createdAt, // Временно используем createdAt, в будущем будем получать dueDate из API
                      priority: 'medium' as const // Временно, в будущем получать из API
                    }))}
                    isLoading={tasksLoading}
                  />;
                })()}
              </div>
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}