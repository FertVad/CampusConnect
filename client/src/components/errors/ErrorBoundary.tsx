import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

function FallbackUI({ error, onReload }: { error?: Error; onReload: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">
            {t('errors.internalServerError')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('errors.connectionError')}
          </p>
          {error && (
            <pre className="p-2 overflow-auto text-xs text-left bg-muted rounded">
              {error.message}
            </pre>
          )}
          <Button onClick={onReload}>{t('common.actions.refresh')}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Here you could send the error to an external logging service
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <FallbackUI error={this.state.error} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
