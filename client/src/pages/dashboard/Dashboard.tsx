import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const { user } = useAuth();
  
  const getWelcomeMessage = () => {
    if (!user) return "Welcome to the College Management System";
    
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
  
  const getDashboardContent = () => {
    if (!user) return <p>Please log in to view your dashboard.</p>;
    
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
          <CardTitle>Upcoming Classes</CardTitle>
          <CardDescription>Your next scheduled classes</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You have 3 classes scheduled today</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Your pending assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You have 2 assignments due this week</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Grades</CardTitle>
          <CardDescription>Recent grade updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p>2 new grades have been posted</p>
        </CardContent>
      </Card>
    </div>
  );
  
  const TeacherDashboard = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Teaching Schedule</CardTitle>
          <CardDescription>Your teaching timetable</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You have 4 classes to teach today</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Assignments to Grade</CardTitle>
          <CardDescription>Pending assignment submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <p>15 assignments need grading</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Student Requests</CardTitle>
          <CardDescription>Students needing assistance</CardDescription>
        </CardHeader>
        <CardContent>
          <p>3 new student requests</p>
        </CardContent>
      </Card>
    </div>
  );
  
  const AdminDashboard = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Overall system health</CardDescription>
        </CardHeader>
        <CardContent>
          <p>All systems operational</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>User account statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <p>245 active users in the system</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Items requiring your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <p>7 pending approvals</p>
        </CardContent>
      </Card>
    </div>
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
          {user ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard` : 'Welcome'}
        </h1>
        <p className="text-xl text-muted-foreground">{getWelcomeMessage()}</p>
      </div>
      
      {getDashboardContent()}
    </div>
  );
};

export default Dashboard;
