import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';

// Create login schema with translations
const createLoginSchema = (t: any) => z.object({
  email: z.string().email(t('auth.validations.validEmail')),
  password: z.string().min(6, t('auth.validations.passwordLength')),
});

// Create registration schema with translations
const createRegisterSchema = (t: any) => insertUserSchema.extend({
  firstName: z.string().min(2, t('auth.validations.firstNameLength')),
  lastName: z.string().min(2, t('auth.validations.lastNameLength')),
  password: z.string().min(6, t('auth.validations.passwordLength')),
  confirmPassword: z.string().min(6, t('auth.validations.confirmPasswordLength')),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth.validations.passwordsMatch'),
  path: ["confirmPassword"],
});

// Define LoginData type
type LoginData = z.infer<ReturnType<typeof createLoginSchema>>;
type RegisterData = z.infer<ReturnType<typeof createRegisterSchema>>;

function LoginForm({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // Create login schema with translations
  const loginSchema = createLoginSchema(t);
  
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginData) {
    loginMutation.mutate(data);
  }
  
  // Redirect to dashboard when login is successful
  // Используем ref для отслеживания предыдущего состояния успешной аутентификации
  const prevSuccessRef = React.useRef(false);
  
  useEffect(() => {
    // Перенаправляем только если статус изменился с false на true
    // Это предотвращает многократные перенаправления
    if (loginMutation.isSuccess && !prevSuccessRef.current) {
      prevSuccessRef.current = true;
      
      // Используем setTimeout для предотвращения проблем с циклами рендеринга
      setTimeout(() => {
        setLocation("/");
      }, 100);
    }
    
    // Сбрасываем флаг, когда статус успеха сбрасывается
    if (!loginMutation.isSuccess) {
      prevSuccessRef.current = false;
    }
  }, [loginMutation.isSuccess, setLocation]);

  return (
    <Card className="glass border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
          {t('auth.login.title')}
        </CardTitle>
        <CardDescription>
          {t('auth.login.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.login.email')}</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.login.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/80" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.login.loggingIn')}
                </>
              ) : (
                t('auth.login.signIn')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <span className="text-muted-foreground">{t('auth.login.noAccount')}</span>
        <Button 
          variant="link" 
          className="px-2 text-indigo-400 hover:text-indigo-300" 
          onClick={() => onTabChange("register")}
        >
          {t('auth.login.createAccount')}
        </Button>
      </CardFooter>
    </Card>
  );
}

function RegisterForm({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // Create registration schema with translations
  const registerSchema = createRegisterSchema(t);
  
  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "student",
    },
  });

  function onSubmit(data: RegisterData) {
    // Remove confirmPassword as it's not part of the API schema
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  }
  
  // Redirect to dashboard when registration is successful
  // Используем ref для отслеживания предыдущего состояния успешной регистрации
  const prevSuccessRef = React.useRef(false);
  
  useEffect(() => {
    // Перенаправляем только если статус изменился с false на true
    // Это предотвращает многократные перенаправления
    if (registerMutation.isSuccess && !prevSuccessRef.current) {
      prevSuccessRef.current = true;
      
      // Используем setTimeout для предотвращения проблем с циклами рендеринга
      setTimeout(() => {
        setLocation("/");
      }, 100);
    }
    
    // Сбрасываем флаг, когда статус успеха сбрасывается
    if (!registerMutation.isSuccess) {
      prevSuccessRef.current = false;
    }
  }, [registerMutation.isSuccess, setLocation]);

  return (
    <Card className="glass border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-indigo-400 to-emerald-300 text-transparent bg-clip-text">
          {t('auth.register.title')}
        </CardTitle>
        <CardDescription>
          {t('auth.register.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.firstName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.placeholders.firstName')} className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.lastName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('auth.placeholders.lastName')} className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.email')}</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.role')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="glass">
                        <SelectValue placeholder={t('auth.placeholders.selectRole')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-modal">
                      <SelectItem value="student">{t('users.roles.student')}</SelectItem>
                      <SelectItem value="teacher">{t('users.roles.teacher')}</SelectItem>
                      <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/80" 
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.register.creatingAccount')}
                </>
              ) : (
                t('auth.register.createAccount')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <span className="text-muted-foreground">{t('auth.register.alreadyHaveAccount')}</span>
        <Button 
          variant="link" 
          className="px-2 text-indigo-400 hover:text-indigo-300" 
          onClick={() => onTabChange("login")}
        >
          {t('auth.register.signIn')}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AuthPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const { t } = useTranslation();

  // Redirect if already logged in
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium">{t('auth.features.schedule')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center w-full lg:w-1/2">
        <div className="mx-auto max-w-md w-full p-6">
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-8 glass">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary/20">
                {t('auth.login.title')}
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary/20">
                {t('auth.register.title')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="glass-card p-0 overflow-hidden">
              <LoginForm onTabChange={setActiveTab} />
            </TabsContent>
            <TabsContent value="register" className="glass-card p-0 overflow-hidden">
              <RegisterForm onTabChange={setActiveTab} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}