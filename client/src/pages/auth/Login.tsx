import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createLoginSchema, type LoginData } from './schema';

interface LoginProps {
  onTabChange: (tab: string) => void;
}

export default function Login({ onTabChange }: LoginProps) {
  const { loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const loginSchema = createLoginSchema(t);
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(data: LoginData) {
    loginMutation.mutate(data);
  }

  const prevSuccessRef = React.useRef(false);
  useEffect(() => {
    if (loginMutation.isSuccess && !prevSuccessRef.current) {
      prevSuccessRef.current = true;
      setTimeout(() => setLocation('/'), 100);
    }
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
        <CardDescription>{t('auth.login.subtitle')}</CardDescription>
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
            <Button type="submit" className="w-full bg-primary hover:bg-primary/80" disabled={loginMutation.isPending}>
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
        <Button variant="link" className="px-2 text-indigo-400 hover:text-indigo-300" onClick={() => onTabChange('register')}>
          {t('auth.login.createAccount')}
        </Button>
      </CardFooter>
    </Card>
  );
}

