import React from "react";
import Dashboard from "@/pages/dashboard/Dashboard";
import Assignments from "@/pages/assignments/Assignments";
import AssignmentDetail from "@/pages/assignments/AssignmentDetail";
import Schedule from "@/pages/schedule/Schedule";
import Chat from "@/pages/chat/Chat";
import TasksPage from "@/pages/tasks/Tasks";
import SettingsPage from "@/pages/settings/Settings";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Users from "@/pages/users/Users";
import UserDetail from "@/pages/users/UserDetail";
import { MainLayout } from "@/components/layout/main-layout";

export interface RouteDefinition {
  path?: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}

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

const ProtectedUsers = () => (
  <MainLayout>
    <Users />
  </MainLayout>
);

const ProtectedChat = () => (
  <MainLayout>
    <Chat />
  </MainLayout>
);

const ProtectedTasks = () => (
  <MainLayout>
    <TasksPage />
  </MainLayout>
);

const ProtectedSettings = () => (
  <MainLayout>
    <SettingsPage />
  </MainLayout>
);

const ProtectedUserDetail = () => (
  <MainLayout>
    <UserDetail />
  </MainLayout>
);

export const routes: RouteDefinition[] = [
  { path: "/login", component: AuthPage },
  { path: "/register", component: AuthPage },
  { path: "/forgot-password", component: ForgotPassword },
  { path: "/", component: ProtectedDashboard },
  { path: "/dashboard", component: ProtectedDashboard },
  { path: "/assignments", component: ProtectedAssignments },
  { path: "/assignments/:id", component: ProtectedAssignmentDetail },
  { path: "/schedule", component: ProtectedSchedule },
  { path: "/users", component: ProtectedUsers, adminOnly: true },
  { path: "/users/:id", component: ProtectedUserDetail, adminOnly: true },
  { path: "/chat", component: ProtectedChat },
  { path: "/chat/:id", component: ProtectedChat },
  { path: "/tasks", component: ProtectedTasks },
  { path: "/settings", component: ProtectedSettings },
  { component: NotFound },
];

export default routes;
