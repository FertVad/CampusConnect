import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect, useContext } from "react";
import { User } from "@shared/schema";
import { UserContext } from "./main";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
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
import NotFound from "@/pages/not-found";

function App() {
  const { user, setUser } = useContext(UserContext);
  const [location, setLocation] = useLocation();

  // Check if user is logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing user from local storage", error);
        localStorage.removeItem("user");
      }
    }
  }, [setUser]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !location.startsWith("/login") && !location.startsWith("/register")) {
      setLocation("/login");
    }
  }, [user, location, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Dashboard routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      
      {/* Assignment routes */}
      <Route path="/assignments" component={Assignments} />
      <Route path="/assignments/:id" component={AssignmentDetail} />
      
      {/* Schedule route */}
      <Route path="/schedule" component={Schedule} />
      
      {/* Grades route */}
      <Route path="/grades" component={Grades} />
      
      {/* User management route (admin only) */}
      <Route path="/users" component={Users} />
      
      {/* Requests route */}
      <Route path="/requests" component={Requests} />
      
      {/* Chat route */}
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:id" component={Chat} />
      
      {/* Documents routes */}
      <Route path="/invoices" component={Invoices} />
      <Route path="/certificates" component={Certificates} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
