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
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";

function App() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Dashboard routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      
      {/* Assignment routes */}
      <ProtectedRoute path="/assignments" component={Assignments} />
      <ProtectedRoute path="/assignments/:id" component={AssignmentDetail} />
      
      {/* Schedule route */}
      <ProtectedRoute path="/schedule" component={Schedule} />
      
      {/* Grades route */}
      <ProtectedRoute path="/grades" component={Grades} />
      
      {/* User management route (admin only) */}
      <ProtectedRoute path="/users" component={Users} />
      
      {/* Requests route */}
      <ProtectedRoute path="/requests" component={Requests} />
      
      {/* Chat route */}
      <ProtectedRoute path="/chat" component={Chat} />
      <ProtectedRoute path="/chat/:id" component={Chat} />
      
      {/* Documents routes */}
      <ProtectedRoute path="/invoices" component={Invoices} />
      <ProtectedRoute path="/certificates" component={Certificates} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
