import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TextField } from '@/components/forms/TextField';
import { TextareaField } from '@/components/forms/TextareaField';
import { SelectField } from '@/components/forms/SelectField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TaskFormData, type UserSummary } from './useTasks';
import React from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<TaskFormData>;
  loading: boolean;
  users: UserSummary[] | undefined;
  onSubmit?: (data: TaskFormData) => void;
}

export default function CreateTaskDialog({ open, onOpenChange, form, loading, users, onSubmit }: Props) {
  const { t } = useTranslation();


  const handleSubmit = form.handleSubmit(
    (data) => {
      onSubmit?.(data);
    },
    () => {}
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
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
            <FormField
              control={form.control}
              name="executorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('task.assignee')}</FormLabel>
                  <Select
                    onValueChange={value => field.onChange(value)}
                    defaultValue={field.value ? String(field.value) : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.select_assignee')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName}
                          <span className="text-gray-500 text-sm ml-2">
                            ({t(`roles.${user.role}`)})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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

