import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const getWelcomeMessage = () => {
    if (!user) return t('dashboard.welcome.guest', 'Добро пожаловать в Образовательный Портал');
    
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
    return `${greeting}, ${user.firstName}!`;
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
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
          {user 
            ? `${translateRole(user.role)} ${t('dashboard.title', 'Панель управления')}` 
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
