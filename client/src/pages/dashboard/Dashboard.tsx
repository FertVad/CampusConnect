import React, { useContext } from 'react';
import { UserContext } from '@/main';
import MainLayout from '@/components/layouts/MainLayout';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import { Redirect } from 'wouter';

const Dashboard = () => {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  const getDashboardByRole = () => {
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
  
  const getWelcomeMessage = () => {
    const currentHour = new Date().getHours();
    let greeting;
    
    if (currentHour < 12) {
      greeting = 'Good morning';
    } else if (currentHour < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    return `${greeting}, ${user.firstName}. Here's what's happening with your education today.`;
  };
  
  return (
    <MainLayout 
      title={`${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard`}
      subtitle={getWelcomeMessage()}
    >
      {getDashboardByRole()}
    </MainLayout>
  );
};

export default Dashboard;
