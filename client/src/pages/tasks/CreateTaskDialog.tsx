import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TextField } from '@/components/forms/TextField';
import { TextareaField } from '@/components/forms/TextareaField';
import { SelectField } from '@/components/forms/SelectField';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import { TaskFormData } from './useTasks';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<TaskFormData>;
  onSubmit: (data: TaskFormData) => void;
  loading: boolean;
  users:
    | {
        id: number;
        firstName?: string;
        lastName?: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        role: string;
      }[]
    | undefined;
}

export default function CreateTaskDialog({ open, onOpenChange, form, onSubmit, loading, users }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    logger.info('CreateTaskDialog open state changed:', open);
  }, [open]);

  useEffect(() => {
    console.log('\u{1F465} Users for dropdown:', users);
    users?.forEach(user => {
      console.log('User:', user.name, user.first_name, user.last_name, user.role);
    });
  }, [users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = form.getValues();
    const taskData = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      executorId: formData.executorId,
      dueDate: formData.dueDate,
      clientId: 1 as number,
    };
    console.log('📝 Submitting task:', taskData);
    console.log('📋 Task data being sent:', JSON.stringify(taskData, null, 2));

    try {
      console.log('🚀 Sending request to /api/tasks');

      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔑 Session:', session ? 'Found' : 'Not found');

      const token = session?.access_token ||
        localStorage.getItem('supabase.auth.token') ||
        document.cookie.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1];
      console.log('🔑 Using auth token:', token ? 'Token found' : 'No token');

      const response = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(taskData),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Task created successfully:', result);

        // Закрыть диалог и обновить список
        onOpenChange(false);
        if (onSubmit) {
          onSubmit(taskData);
        }
      } else {
        const error = await response.text();
        console.error('❌ Error response:', error);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            logger.info('CreateTaskDialog trigger button clicked');
            onOpenChange(true);
          }}
          type="button"
        >
          {t('task.create_new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('task.new_task')}</DialogTitle>
          <DialogDescription>{t('task.new_task_description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField control={form.control} name="title" label={t('task.title')} />
            <TextareaField control={form.control} name="description" label={t('task.description')} />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                control={form.control}
                name="priority"
                label={t('task.priority.label')}
                placeholder={t('task.priority.select')}
                options={[
                  { value: 'high', label: t('task.priority.high') },
                  { value: 'medium', label: t('task.priority.medium') },
                  { value: 'low', label: t('task.priority.low') },
                ]}
              />
              <SelectField
                control={form.control}
                name="status"
                label={t('task.status.label')}
                placeholder={t('task.status.select')}
                options={[
                  { value: 'new', label: t('task.status.new') },
                  { value: 'in_progress', label: t('task.status.in_progress') },
                  { value: 'on_hold', label: t('task.status.on_hold') },
                ]}
              />
            </div>
            <SelectField
              control={form.control}
              name="executorId"
              label={t('task.assignee')}
              placeholder={t('task.select_assignee')}
              options={(users || []).map(u => ({
                value: u.id,
                label: `${u.name || `${u.first_name ?? u.firstName ?? ''} ${u.last_name ?? u.lastName ?? ''}`.trim()} (${u.role})`,
              }))}
            />
            {!users || users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('task.no_users_available')}
              </p>
            ) : null}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('task.due_date')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>{t('task.pick_date')}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={loading || !users || users.length === 0}
                onClick={handleSubmit}
              >
                {t('task.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

