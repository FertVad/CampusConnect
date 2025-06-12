import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import { useTranslation } from 'react-i18next';

export default function AuthPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('login');
  const { t } = useTranslation();

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container flex h-screen bg-zinc-900 text-gray-200">
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-10">
        <div className="space-y-6">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
            {t('auth.siteTitle')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('auth.siteDescription')}
          </p>
          <div className="flex flex-col gap-4 mt-8">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-1 w-8 h-8 flex items-center justify-center glass">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium">{t('auth.features.materials')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-1 w-8 h-8 flex items-center justify-center glass">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium">{t('auth.features.grades')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-1 w-8 h-8 flex items-center justify-center glass">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium">{t('auth.features.communication')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-1 w-8 h-8 flex items-center justify-center glass">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium">{t('auth.features.schedule')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center w-full lg:w-1/2">
        <div className="mx-auto max-w-md w-full p-6">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 glass">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary/20">
                {t('auth.login.title')}
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary/20">
                {t('auth.register.title')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="glass-card p-0 overflow-hidden">
              <Login onTabChange={setActiveTab} />
            </TabsContent>
            <TabsContent value="register" className="glass-card p-0 overflow-hidden">
              <Register onTabChange={setActiveTab} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
