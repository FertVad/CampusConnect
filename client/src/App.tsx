import React from "react";
import { Switch, Route } from "wouter";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import routes from "./routes";


function App() {
  const { user, isLoading } = useAuth();
  
  // Если пользователь не авторизован и загрузка завершена, 
  // сразу показываем страницу авторизации
  if (!isLoading && !user) {
    return <AuthPage />;
  }
  
  return (
    <Switch>
      {routes.map(({ path, component, protected: requiresAuth, adminOnly }, idx) => {
        if (!path) {
          return <Route key={idx} component={component} />;
        }
        if (requiresAuth) {
          return (
            <ProtectedRoute
              key={idx}
              path={path}
              component={component}
              adminOnly={adminOnly}
            />
          );
        }
        return <Route key={idx} path={path} component={component} />;
      })}
    </Switch>
  );
}

export default App;
