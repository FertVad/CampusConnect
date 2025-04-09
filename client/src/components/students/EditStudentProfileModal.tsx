import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Интерфейс для данных студента
interface StudentProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  group?: string;
  major?: string;
  course?: number;
}

interface EditStudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
}

const EditStudentProfileModal: React.FC<EditStudentProfileModalProps> = ({
  isOpen,
  onClose,
  student
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Схема валидации для формы
  const formSchema = z.object({
    firstName: z.string().min(1, 'Имя обязательно для заполнения'),
    lastName: z.string().min(1, 'Фамилия обязательна для заполнения'),
    email: z.string().email('Введите корректный email'),
    phone: z.string().optional(),
    group: z.string().optional(),
    major: z.string().optional(),
    course: z.coerce.number().int().positive().optional(),
  });

  // Тип данных формы
  type FormData = z.infer<typeof formSchema>;

  // Инициализация формы
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone || '',
      group: student.group || '',
      major: student.major || '',
      course: student.course || undefined,
    },
  });

  // Обработчик отправки формы
  const onSubmit = async (data: FormData) => {
    try {
      // Отправляем запрос на обновление профиля
      const response = await apiRequest('PUT', `/api/users/${student.id}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при обновлении профиля');
      }

      // Инвалидируем кеш для обновления данных на всех страницах
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', student.id] });
      
      // Показываем уведомление об успехе
      toast({
        title: 'Профиль обновлен',
        description: 'Данные профиля успешно сохранены',
        variant: 'default',
      });
      
      // Закрываем модальное окно
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      // Показываем уведомление об ошибке
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить профиль',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('student.edit.title', 'Редактирование профиля студента')}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Имя */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('user.firstName', 'Имя')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Фамилия */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('user.lastName', 'Фамилия')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('user.email', 'Email')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Телефон */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('user.phone', 'Телефон')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Группа */}
              <FormField
                control={form.control}
                name="group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('student.group', 'Группа')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Курс */}
              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('student.course', 'Курс')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min={1} 
                        max={6} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Специальность */}
              <FormField
                control={form.control}
                name="major"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('student.major', 'Специальность')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('actions.cancel', 'Отмена')}
              </Button>
              <Button type="submit">
                {t('actions.save', 'Сохранить')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentProfileModal;