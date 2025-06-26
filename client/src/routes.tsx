import React from "react";
import Dashboard from "@/pages/dashboard/Dashboard";
import Assignments from "@/pages/assignments/Assignments";
import AssignmentDetail from "@/pages/assignments/AssignmentDetail";
import Schedule from "@/pages/schedule/Schedule";
import Chat from "@/pages/chat/Chat";
import TasksPage from "@/pages/tasks/Tasks";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Users from "@/pages/users/Users";
import UserDetail from "@/pages/users/UserDetail";
import { MainLayout } from "@/components/layout/main-layout";

export interface RouteDefinition {
  path?: string;
  component: () => React.JSX.Element;
  protected?: boolean;
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

const ProtectedUserDetail = () => (
  <MainLayout>
    <UserDetail />
  </MainLayout>
);

export const routes: RouteDefinition[] = [
  { path: "/auth", component: AuthPage },
  { path: "/", component: ProtectedDashboard, protected: true },
  { path: "/dashboard", component: ProtectedDashboard, protected: true },
  { path: "/assignments", component: ProtectedAssignments, protected: true },
  { path: "/assignments/:id", component: ProtectedAssignmentDetail, protected: true },
  { path: "/schedule", component: ProtectedSchedule, protected: true },
  { path: "/users", component: ProtectedUsers, protected: true, adminOnly: true },
  { path: "/users/:id", component: ProtectedUserDetail, protected: true, adminOnly: true },
  { path: "/chat", component: ProtectedChat, protected: true },
  { path: "/chat/:id", component: ProtectedChat, protected: true },
  { path: "/tasks", component: ProtectedTasks, protected: true },
  { component: NotFound },
];

export default routes;
