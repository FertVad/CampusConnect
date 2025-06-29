import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createRegisterSchema, type RegisterData } from './schema';

interface RegisterProps {
  onTabChange: (tab: string) => void;
}

export default function Register({ onTabChange }: RegisterProps) {
  const { registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const registerSchema = createRegisterSchema(t);
  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'student',
    },
  });

  function onSubmit(data: RegisterData) {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  }

  const prevSuccessRef = React.useRef(false);
  useEffect(() => {
    if (registerMutation.isSuccess && !prevSuccessRef.current) {
      prevSuccessRef.current = true;
      setTimeout(() => setLocation('/'), 100);
    }
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
        <CardDescription>{t('auth.register.subtitle')}</CardDescription>
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
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.register.role')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <p className="text-xs text-muted-foreground">
              {t('auth.register.phoneLater', 'Телефон можно добавить в настройках профиля')}
            </p>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/80" disabled={registerMutation.isPending}>
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
        <Button variant="link" className="px-2 text-indigo-400 hover:text-indigo-300" onClick={() => onTabChange('login')}>
          {t('auth.register.signIn')}
        </Button>
      </CardFooter>
    </Card>
  );
}

