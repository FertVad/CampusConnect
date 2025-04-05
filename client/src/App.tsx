import React from "react";
import { Switch, Route } from "wouter";
import Dashboard from "@/pages/dashboard/Dashboard";
import Assignments from "@/pages/assignments/Assignments";
import AssignmentDetail from "@/pages/assignments/AssignmentDetail";
import Schedule from "@/pages/schedule/Schedule";
import Grades from "@/pages/grades/Grades";
import Users from "@/pages/users/Users";
import Requests from "@/pages/requests/Requests";
import Chat from "@/pages/chat/Chat";
import Invoices from "@/pages/documents/Invoices";
import Certificates from "@/pages/documents/Certificates";
import ImportedFiles from "@/pages/admin/ImportedFiles";
import TasksPage from "@/pages/tasks/Tasks";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";

import { MainLayout } from "@/components/layout/main-layout";

// Wrap components with MainLayout for protected routes
const ProtectedDashboard = () => (
  <MainLayout>
    <Dashboard />
  </MainLayout>
);

const ProtectedAssignments = () => (
  <MainLayout>
    <Assignments />
  </MainLayout>
);

const ProtectedAssignmentDetail = () => (
  <MainLayout>
    <AssignmentDetail />
  </MainLayout>
);

const ProtectedSchedule = () => (
  <MainLayout>
    <Schedule />
  </MainLayout>
);

const ProtectedGrades = () => (
  <MainLayout>
    <Grades />
  </MainLayout>
);

const ProtectedUsers = () => (
  <MainLayout>
    <Users />
  </MainLayout>
);

const ProtectedRequests = () => (
  <MainLayout>
    <Requests />
  </MainLayout>
);

const ProtectedChat = () => (
  <MainLayout>
    <Chat />
  </MainLayout>
);

const ProtectedInvoices = () => (
  <MainLayout>
    <Invoices />
  </MainLayout>
);

const ProtectedCertificates = () => (
  <MainLayout>
    <Certificates />
  </MainLayout>
);

// Tasks page
const ProtectedTasks = () => (
  <MainLayout>
    <TasksPage />
  </MainLayout>
);

// Admin pages
const ProtectedImportedFiles = () => (
  <MainLayout>
    <ImportedFiles />
  </MainLayout>
);

function App() {
  const { user, isLoading } = useAuth();
  
  // Если пользователь не авторизован и загрузка завершена, 
  // сразу показываем страницу авторизации
  if (!isLoading && !user) {
    return <AuthPage />;
  }
  
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Dashboard routes */}
      <ProtectedRoute path="/" component={ProtectedDashboard} />
      <ProtectedRoute path="/dashboard" component={ProtectedDashboard} />
      
      {/* Assignment routes */}
      <ProtectedRoute path="/assignments" component={ProtectedAssignments} />
      <ProtectedRoute path="/assignments/:id" component={ProtectedAssignmentDetail} />
      
      {/* Schedule route */}
      <ProtectedRoute path="/schedule" component={ProtectedSchedule} />
      
      {/* Grades route */}
      <ProtectedRoute path="/grades" component={ProtectedGrades} />
      
      {/* User management route (admin only) */}
      <ProtectedRoute path="/users" component={ProtectedUsers} adminOnly={true} />
      
      {/* Requests route */}
      <ProtectedRoute path="/requests" component={ProtectedRequests} />
      
      {/* Chat route */}
      <ProtectedRoute path="/chat" component={ProtectedChat} />
      <ProtectedRoute path="/chat/:id" component={ProtectedChat} />
      
      {/* Documents routes */}
      <ProtectedRoute path="/invoices" component={ProtectedInvoices} />
      <ProtectedRoute path="/certificates" component={ProtectedCertificates} />
      
      {/* Tasks route */}
      <ProtectedRoute path="/tasks" component={ProtectedTasks} />
      
      {/* Admin routes с проверкой на роль admin */}
      <ProtectedRoute path="/admin/imported-files" component={ProtectedImportedFiles} adminOnly={true} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
