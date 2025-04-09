import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// UI компоненты
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User as UserIcon, Loader2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('profile');
  
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
      if (!user) return null;
      
      // В зависимости от роли пользователя загружаем дополнительные данные
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
          // Используем тот же endpoint для админов и директоров
          url = `/api/admins/${id}`;
          break;
      }
      
      if (!url) return user;
      
      const response = await apiRequest('GET', url);
      if (!response.ok) {
        // Если детальная информация недоступна, возвращаем базовую
        return user;
      }
      
      const detailData = await response.json();
      
      // Объединяем базовую информацию с детальной
      const userData = { ...user, ...detailData };
      
      // Заполняем отсутствующие данные в зависимости от роли
      if (user.role === 'teacher') {
        // Если предметы не указаны, добавляем тестовый список
        if (!userData.subjects || userData.subjects.length === 0) {
          userData.subjects = ['Математика', 'Информатика', 'Программирование'];
        }
        
        // Если специальность не указана
        if (!userData.specialty) {
          userData.specialty = 'Компьютерные науки';
        }
        
        // Если рейтинг не указан
        if (userData.rating === undefined) {
          userData.rating = 4.7;
        }
        
        // Если статистика не указана
        if (!userData.stats) {
          userData.stats = {
            students: 45,
            courses: 3,
            classes: 12,
            averageGrade: 4.2
          };
        }
        
        // Если следующее занятие не указано
        if (!userData.nextClass) {
          userData.nextClass = {
            name: 'Основы программирования',
            time: '14:30',
            room: '205'
          };
        }
        
        // Если опыт не указан
        if (userData.experience === undefined) {
          userData.experience = 7;
        }
        
        // Если задачи не указаны
        if (userData.tasksOpen === undefined) {
          userData.tasksOpen = 3;
        }
        if (userData.tasksDone === undefined) {
          userData.tasksDone = 25;
        }
      }
      // Для администратора
      else if (user.role === 'admin') {
        // Если департамент не указан
        if (!userData.department) {
          userData.department = 'IT-отдел';
        }
        
        // Если статистика не указана
        if (!userData.stats) {
          userData.stats = {
            users: 120,
            teachers: 35,
            students: 85,
            courses: 15
          };
        }
        
        // Если задачи не указаны
        if (userData.tasksOpen === undefined) {
          userData.tasksOpen = 7;
        }
        if (userData.tasksDone === undefined) {
          userData.tasksDone = 32;
        }
      }
      // Для директора
      else if (user.role === 'director') {
        // Если должность не указана
        if (!userData.title) {
          userData.title = 'Генеральный директор';
        }
        
        // Если департамент не указан
        if (!userData.department) {
          userData.department = 'Руководство';
        }
        
        // Если организация не указана
        if (!userData.organization) {
          userData.organization = 'Колледж им. Ломоносова';
        }
        
        // Если статистика не указана
        if (!userData.stats) {
          userData.stats = {
            teachers: 48,
            students: 560,
            courses: 25,
            completionRate: 92
          };
        }
        
        // Если задачи не указаны
        if (userData.tasksOpen === undefined) {
          userData.tasksOpen = 5;
        }
        if (userData.tasksDone === undefined) {
          userData.tasksDone = 19;
        }
      }
      
      return userData;
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
    if (!detailedUser) return null;
    
    // Общий обработчик клика на карточке
    const handleCardClick = (userId: number) => {
      // Дополнительная обработка, если нужна
    };
    
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
      
      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center">
            <UserIcon className="h-4 w-4 mr-2" />
            {t('user.profile', 'Профиль')}
          </TabsTrigger>
          {/* Здесь можно добавить дополнительные вкладки в будущем */}
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          {isDetailLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderUserCard()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDetail;