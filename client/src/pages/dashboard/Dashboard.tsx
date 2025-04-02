import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const getWelcomeMessage = () => {
    if (!user) return t('dashboard.welcome.guest', 'Добро пожаловать в Систему Управления Колледжем');
    
    const currentHour = new Date().getHours();
    let greeting;
    
    if (currentHour < 12) {
      greeting = t('dashboard.greeting.morning', 'Доброе утро');
    } else if (currentHour < 18) {
      greeting = t('dashboard.greeting.afternoon', 'Добрый день');
    } else {
      greeting = t('dashboard.greeting.evening', 'Добрый вечер');
    }
    
    // Using interpolation
    const welcomeMessage = `${greeting}, ${user.firstName}. Вот что происходит с вашим обучением сегодня.`;
    return welcomeMessage;
  };
  
  const getDashboardContent = () => {
    if (!user) return <p>{t('dashboard.loginRequired', 'Пожалуйста, войдите в систему для просмотра вашей панели управления.')}</p>;
    
    switch (user.role) {
      case 'student':
        return <StudentDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <StudentDashboard />;
    }
  };
  
  // Placeholder dashboard components
  const StudentDashboard = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('schedule.title', 'Расписание')}</CardTitle>
          <CardDescription>{t('dashboard.student.classes', 'Ваши ближайшие занятия')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.student.scheduledToday', 'У вас запланировано 3 занятия на сегодня')}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('assignments.title', 'Задания')}</CardTitle>
          <CardDescription>{t('dashboard.student.pendingAssignments', 'Ваши ожидающие задания')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.student.dueSoon', 'У вас 2 задания со сроком сдачи на этой неделе')}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('grades.title', 'Оценки')}</CardTitle>
          <CardDescription>{t('dashboard.student.recentGrades', 'Недавние обновления оценок')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.student.newGrades', 'Добавлено 2 новых оценки')}</p>
        </CardContent>
      </Card>
    </div>
  );
  
  const TeacherDashboard = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('dashboard.teacher.schedule', 'Расписание занятий')}</CardTitle>
          <CardDescription>{t('dashboard.teacher.timetable', 'Ваше расписание преподавания')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.teacher.classesToday', 'У вас 4 занятия для преподавания сегодня')}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('dashboard.teacher.grading', 'Задания для оценки')}</CardTitle>
          <CardDescription>{t('dashboard.teacher.pendingSubmissions', 'Ожидающие проверки работы')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.teacher.needGrading', '15 заданий требуют оценки')}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('requests.title', 'Запросы студентов')}</CardTitle>
          <CardDescription>{t('dashboard.teacher.studentHelp', 'Студентам требуется помощь')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.teacher.newRequests', '3 новых запроса от студентов')}</p>
        </CardContent>
      </Card>
    </div>
  );
  
  const AdminDashboard = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('dashboard.admin.systemStatus', 'Состояние системы')}</CardTitle>
          <CardDescription>{t('dashboard.admin.systemHealth', 'Общее состояние системы')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.admin.operational', 'Все системы работают нормально')}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('dashboard.admin.userManagement', 'Управление пользователями')}</CardTitle>
          <CardDescription>{t('dashboard.admin.userStats', 'Статистика пользователей')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.admin.activeUsers', '245 активных пользователей в системе')}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t('dashboard.admin.pendingApprovals', 'Ожидающие подтверждения')}</CardTitle>
          <CardDescription>{t('dashboard.admin.requireApproval', 'Элементы, требующие вашего подтверждения')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('dashboard.admin.approvalCount', '7 ожидающих подтверждений')}</p>
        </CardContent>
      </Card>
    </div>
  );
  
  // Translate role
  const translateRole = (role: string) => {
    switch (role) {
      case 'admin':
        return t('users.roles.admin', 'Администратор');
      case 'teacher':
        return t('users.roles.teacher', 'Преподаватель');
      case 'student':
        return t('users.roles.student', 'Студент');
      default:
        return role;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
          {user 
            ? t('dashboard.title', '{{role}} Панель управления', { role: translateRole(user.role) }) 
            : t('dashboard.welcome.title', 'Добро пожаловать')
          }
        </h1>
        <p className="text-xl text-muted-foreground">{getWelcomeMessage()}</p>
      </div>
      
      {getDashboardContent()}
    </div>
  );
};

export default Dashboard;
