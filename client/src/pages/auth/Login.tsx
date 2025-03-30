import React, { useState, useContext } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginCredentials } from '@shared/schema';
import { login } from '@/lib/auth';
import { UserContext } from '@/main';

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_, setLocation] = useLocation();
  const userContext = useContext(UserContext);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const user = await login(data);
      userContext?.setUser(user);
      setLocation('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block bg-primary p-3 rounded-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-heading text-neutral-800">EduPortal</h1>
          <p className="text-neutral-500 mt-2">College Management System</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  {...register('username')}
                  placeholder="Enter your username"
                  className={errors.username ? "border-error" : ""}
                />
                {errors.username && (
                  <p className="text-sm text-error">{errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Enter your password"
                  className={errors.password ? "border-error" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-error">{errors.password.message}</p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-neutral-500">
              <p>Demo Accounts:</p>
              <div className="flex justify-center flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100" onClick={() => {
                  register('username').onChange({ target: { value: 'admin' } });
                  register('password').onChange({ target: { value: 'admin123' } });
                }}>
                  Admin
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100" onClick={() => {
                  register('username').onChange({ target: { value: 'david' } });
                  register('password').onChange({ target: { value: 'teacher123' } });
                }}>
                  Teacher
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100" onClick={() => {
                  register('username').onChange({ target: { value: 'alex' } });
                  register('password').onChange({ target: { value: 'student123' } });
                }}>
                  Student
                </Badge>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

import { Badge } from '@/components/ui/badge';

export default Login;
