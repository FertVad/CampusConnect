import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import routes from "./routes";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];


function App() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const isPublicRoute = PUBLIC_ROUTES.some((r) => location.startsWith(r));

  useEffect(() => {
    if (!isLoading && !user && !isPublicRoute) {
      setLocation('/login');
    }
  }, [isLoading, user, isPublicRoute, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <Switch>
      {routes.map(({ path, component, adminOnly }, idx) => {
        if (!path) {
          return <Route key={idx} component={component} />;
        }

        const isPublic = PUBLIC_ROUTES.includes(path);
        if (!isPublic) {
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
