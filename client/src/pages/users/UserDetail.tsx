import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// UI компоненты
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2 } from 'lucide-react';

// Компоненты карточек пользователей
import StudentCard, { Student } from '@/components/users/StudentCard';
import TeacherCard, { Teacher } from '@/components/users/TeacherCard';
import AdminCard, { Admin } from '@/components/users/AdminCard';
import DirectorCard, { Director } from '@/components/users/DirectorCard';

// Интерфейс базового пользователя
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'director';
}

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Запрос данных пользователя
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/users', id],
    queryFn: async () => {
      // Сначала получим базовую информацию о пользователе
      const response = await apiRequest('GET', `/api/users/${id}`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные пользователя');
      }
      return response.json() as Promise<User>;
    }
  });
  
  // Запрос детальных данных в зависимости от роли
  const { data: detailedUser, isLoading: isDetailLoading } = useQuery({
    queryKey: ['/api/users', id, 'details'],
    queryFn: async () => {
      if (!user) {
        console.error('User data not available for detailed query');
        return null;
      }
      
      // Подготовим базовую информацию о пользователе
      const baseUserData = { ...user };
      
      // Готовим объект для хранения деталей в зависимости от роли
      let roleDetails = {};
      
      try {
        // Загружаем дополнительные данные в соответствии с ролью пользователя
        let url = '';
        switch (user.role) {
          case 'student':
            url = `/api/students/${id}`;
            break;
          case 'teacher':
            url = `/api/teachers/${id}`;
            break;
          case 'admin':
          case 'director':
            url = `/api/admins/${id}`;
            break;
        }
        
        if (url) {
          const response = await apiRequest('GET', url);
          if (response.ok) {
            const detailData = await response.json();
            roleDetails = { ...detailData };
          } else {
            console.warn(`Failed to load detailed data from ${url}, status: ${response.status}`);
          }
        }
      } catch (err) {
        console.error('Error loading user details:', err);
      }
      
      // В зависимости от роли, добавляем тестовые данные если нужно
      if (user.role === 'teacher') {
        // Для учителя
        const teacherDefaults = {
          subjects: ['Математика', 'Информатика', 'Программирование'],
          specialty: 'Компьютерные науки',
          rating: 4.7,
          stats: {
            students: 45,
            courses: 3,
            classes: 12,
            averageGrade: 4.2
          },
          nextClass: {
            name: 'Основы программирования',
            time: '14:30',
            room: '205'
          },
          experience: 7,
          tasksOpen: 3,
          tasksDone: 25
        };
        
        // Применяем значения по умолчанию только для отсутствующих полей
        roleDetails = {
          ...teacherDefaults,
          ...roleDetails
        };
      } else if (user.role === 'admin') {
        // Для администратора
        const adminDefaults = {
          department: 'IT-отдел',
          stats: {
            users: 120,
            teachers: 35,
            students: 85,
            courses: 15
          },
          tasksOpen: 7,
          tasksDone: 32
        };
        
        roleDetails = {
          ...adminDefaults,
          ...roleDetails
        };
      } else if (user.role === 'director') {
        // Для директора
        const directorDefaults = {
          title: 'Генеральный директор',
          department: 'Руководство',
          organization: 'Колледж им. Ломоносова',
          stats: {
            teachers: 48,
            students: 560,
            courses: 25,
            completionRate: 92
          },
          tasksOpen: 5,
          tasksDone: 19
        };
        
        roleDetails = {
          ...directorDefaults,
          ...roleDetails
        };
      }
      
      // Объединяем базовые данные с детальными
      const combinedData = {
        ...baseUserData,
        ...roleDetails
      };
      
      console.log('Complete user data:', combinedData);
      return combinedData;
    },
    enabled: !!user, // Запрос выполняется только после получения базовой информации
  });
  
  useEffect(() => {
    if (error) {
      toast({
        title: t('errors.loadingFailed', 'Ошибка загрузки'),
        description: error instanceof Error ? error.message : 'Не удалось загрузить данные пользователя',
        variant: 'destructive',
      });
    }
  }, [error, toast, t]);
  
  // Рендерим соответствующую карточку по роли
  const renderUserCard = () => {
    console.log('Rendering user card for:', detailedUser);
    
    if (!detailedUser) {
      console.error('No detailed user data available');
      return (
        <Card className="p-6 text-center">
          <CardHeader>
            <CardTitle>{t('errors.dataNotAvailable', 'Данные недоступны')}</CardTitle>
            <CardDescription>{t('errors.tryAgain', 'Попробуйте обновить страницу')}</CardDescription>
          </CardHeader>
        </Card>
      );
    }
    
    // Общий обработчик клика на карточке
    const handleCardClick = (userId: number) => {
      console.log('Card clicked for user:', userId);
    };
    
    // Выбираем компонент карточки в зависимости от роли
    switch (detailedUser.role) {
      case 'student':
        return (
          <StudentCard 
            student={detailedUser as Student} 
            onClick={handleCardClick} 
          />
        );
      case 'teacher':
        return (
          <TeacherCard 
            teacher={detailedUser as Teacher} 
            onClick={handleCardClick} 
          />
        );
      case 'admin':
        return (
          <AdminCard 
            admin={detailedUser as Admin} 
            onClick={handleCardClick} 
          />
        );
      case 'director':
        return (
          <DirectorCard 
            director={detailedUser as Director} 
            onClick={handleCardClick} 
          />
        );
      default:
        return (
          <Card className="p-6">
            <CardHeader>
              <CardTitle>{detailedUser.firstName} {detailedUser.lastName}</CardTitle>
              <CardDescription>{detailedUser.email}</CardDescription>
            </CardHeader>
          </Card>
        );
    }
  };
  
  // Рендер состояния загрузки
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/users')}
            disabled
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back', 'Назад')}
          </Button>
          <div className="flex-1">
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        
        <div className="grid gap-6">
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>
    );
  }
  
  // Рендер ошибки
  if (error || !user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/users')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back', 'Назад')}
          </Button>
        </div>
        
        <Card className="p-6 text-center">
          <CardHeader>
            <CardTitle>{t('errors.notFound', 'Пользователь не найден')}</CardTitle>
            <CardDescription>{t('errors.tryAgain', 'Попробуйте вернуться к списку пользователей')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  // Получаем заголовок страницы в зависимости от роли
  const getPageTitle = () => {
    const roleText = {
      'student': t('roles.student', 'Студент'),
      'teacher': t('roles.teacher', 'Преподаватель'),
      'admin': t('roles.admin', 'Администратор'),
      'director': t('roles.director', 'Директор')
    }[user.role] || t('users.profile', 'Профиль пользователя');
    
    return `${roleText}: ${user.firstName} ${user.lastName}`;
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/users')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', 'Назад')}
        </Button>
        <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
      </div>
      
      <div className="space-y-4">
        {isDetailLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          renderUserCard()
        )}
      </div>
    </div>
  );
};

export default UserDetail;