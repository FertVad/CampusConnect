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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

// Интерфейс для данных пользователя
export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'director';
  phone?: string;
  department?: string;
  organization?: string;
  title?: string;
  // Специфичные поля для студента
  group?: string;
  major?: string;
  course?: number;
  // Специфичные поля для преподавателя
  specialty?: string;
  subjects?: string[];
  experience?: number;
}

interface EditUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

const EditUserProfileModal: React.FC<EditUserProfileModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Определяем, может ли текущий пользователь изменять роли
  const canChangeRole = currentUser?.role === 'director';

  // Схема валидации для формы
  const formSchema = z.object({
    firstName: z.string().min(1, 'Имя обязательно для заполнения'),
    lastName: z.string().min(1, 'Фамилия обязательна для заполнения'),
    email: z.string().email('Введите корректный email'),
    role: z.enum(['student', 'teacher', 'admin', 'director']),
    phone: z.string().optional(),
    department: z.string().optional(),
    organization: z.string().optional(),
    title: z.string().optional(),
    // Поля для студента
    group: z.string().optional(),
    major: z.string().optional(),
    course: z.coerce.number().int().positive().optional(),
    // Поля для преподавателя
    specialty: z.string().optional(),
    experience: z.coerce.number().int().nonnegative().optional(),
  });

  // Тип данных формы
  type FormData = z.infer<typeof formSchema>;

  // Инициализация формы
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      department: user.department || '',
      organization: user.organization || '',
      title: user.title || '',
      // Поля для студента
      group: user.group || '',
      major: user.major || '',
      course: user.course,
      // Поля для преподавателя
      specialty: user.specialty || '',
      experience: user.experience,
    },
  });

  // Получаем текущую роль из формы
  const currentRole = form.watch('role');

  // Обработчик отправки формы
  const onSubmit = async (data: FormData) => {
    try {
      // Формируем данные для отправки в зависимости от роли
      // Удаляем проблемные или нерелевантные поля из данных, отправляемых на сервер
      // Например, не отправляем 'role', 'password', и другие поля, которые не должны изменяться
      const formData: Record<string, any> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      };
      
      // Добавляем только нужные поля в зависимости от роли
      if (data.phone) formData.phone = data.phone;

      // Отправляем запрос на обновление профиля
      const response = await apiRequest('PUT', `/api/users/${user.id}`, formData);
      
      if (!response.ok) {
        let errorMessage = 'Ошибка при обновлении профиля';
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Если не удалось распарсить JSON, используем statusText
          errorMessage = response.statusText || errorMessage;
          console.error('Error parsing error response:', response.status, response.statusText);
        }
        throw new Error(errorMessage);
      }

      // Если роль изменилась, отправляем дополнительный запрос для обновления роли
      if (canChangeRole && data.role !== user.role) {
        const roleResponse = await apiRequest('PATCH', `/api/users/${user.id}/role`, {
          role: data.role
        });
        
        if (!roleResponse.ok) {
          let errorMessage = 'Ошибка при обновлении роли';
          try {
            const errorData = await roleResponse.json();
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            errorMessage = roleResponse.statusText || errorMessage;
            console.error('Error parsing role update error:', roleResponse.status, roleResponse.statusText);
          }
          throw new Error(errorMessage);
        }
      }

      // Обновляем дополнительные данные в зависимости от роли
      // Для студента
      if (data.role === 'student' && (data.group || data.major || data.course)) {
        const studentData: Record<string, any> = {};
        if (data.group) studentData.group = data.group;
        if (data.major) studentData.major = data.major;
        if (data.course) studentData.course = data.course;

        const studentResponse = await apiRequest('PUT', `/api/students/${user.id}`, studentData);
        if (!studentResponse.ok) {
          try {
            const errorText = await studentResponse.text();
            console.warn('Failed to update student details:', studentResponse.status, errorText);
          } catch (e) {
            console.warn('Failed to update student details, but user was updated');
          }
        }
      }
      // Для преподавателя
      else if (data.role === 'teacher' && (data.specialty || data.experience)) {
        const teacherData: Record<string, any> = {};
        if (data.specialty) teacherData.specialty = data.specialty;
        if (data.experience) teacherData.experience = data.experience;

        const teacherResponse = await apiRequest('PUT', `/api/teachers/${user.id}`, teacherData);
        if (!teacherResponse.ok) {
          try {
            const errorText = await teacherResponse.text();
            console.warn('Failed to update teacher details:', teacherResponse.status, errorText);
          } catch (e) {
            console.warn('Failed to update teacher details, but user was updated');
          }
        }
      }
      // Для админа или директора
      else if ((data.role === 'admin' || data.role === 'director') && 
               (data.department || data.title || data.organization)) {
        const adminData: Record<string, any> = {};
        if (data.department) adminData.department = data.department;
        if (data.title) adminData.title = data.title;
        if (data.organization) adminData.organization = data.organization;

        const adminResponse = await apiRequest('PUT', `/api/admins/${user.id}`, adminData);
        if (!adminResponse.ok) {
          try {
            const errorText = await adminResponse.text();
            console.warn('Failed to update admin details:', adminResponse.status, errorText);
          } catch (e) {
            console.warn('Failed to update admin details, but user was updated');
          }
        }
      }

      console.log('🔄 Обновление данных после редактирования...');

      // Шаг 1: Сначала инвалидируем все связанные запросы
      // Это говорит react-query, что данные устарели и их нужно обновить
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/users'],
        refetchType: 'none' // Не делаем рефетч сразу, только помечаем данные как устаревшие
      });
      
      // Шаг 2: Принудительно обновляем наиболее важные и конкретные запросы
      // Это более точечный и быстрый подход, чем перезагрузка страницы
      await queryClient.refetchQueries({ 
        queryKey: ['/api/users', user.id],
        exact: true // Обновляем только точное совпадение ключей
      });
      
      // Шаг 3: Обновляем типоспецифичные данные
      if (data.role === 'student') {
        await queryClient.refetchQueries({ 
          queryKey: ['/api/students', user.id],
          exact: true
        });
      } else if (data.role === 'teacher') {
        await queryClient.refetchQueries({ 
          queryKey: ['/api/teachers', user.id],
          exact: true
        });
      } else if (data.role === 'admin' || data.role === 'director') {
        await queryClient.refetchQueries({ 
          queryKey: ['/api/admins', user.id],
          exact: true
        });
      }
      
      // Шаг 4: Обновляем связанные данные (задачи, и т.д.)
      await queryClient.refetchQueries({ 
        queryKey: ['/api/users', user.id, 'tasks'],
        exact: true 
      });
      
      console.log('✅ Данные успешно обновлены');
      
      // Показываем уведомление об успехе
      toast({
        title: t('user.profileUpdated', 'Профиль обновлен'),
        description: t('user.profileSaved', 'Данные профиля успешно сохранены'),
        variant: 'default', // Используем стандартный вариант для уведомления об успехе
      });
      
      // Закрываем модальное окно
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      // Показываем уведомление об ошибке
      toast({
        title: t('errors.title', 'Ошибка'),
        description: error instanceof Error ? error.message : t('user.updateFailed', 'Не удалось обновить профиль'),
        variant: 'destructive',
      });
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'student':
        return t('roles.student', 'Студент');
      case 'teacher':
        return t('roles.teacher', 'Преподаватель');
      case 'admin':
        return t('roles.admin', 'Администратор');
      case 'director':
        return t('roles.director', 'Директор');
      default:
        return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('user.edit.title', 'Редактирование профиля')} - {getRoleTitle(user.role)}
          </DialogTitle>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            
            {/* Роль пользователя (только для директора) */}
            {canChangeRole && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('user.role', 'Роль')}</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('user.selectRole', 'Выберите роль')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="student">{t('roles.student', 'Студент')}</SelectItem>
                        <SelectItem value="teacher">{t('roles.teacher', 'Преподаватель')}</SelectItem>
                        <SelectItem value="admin">{t('roles.admin', 'Администратор')}</SelectItem>
                        <SelectItem value="director">{t('roles.director', 'Директор')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Поля для студента */}
            {(user.role === 'student' || currentRole === 'student') && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium">{t('student.details', 'Информация о студенте')}</h3>
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
              </div>
            )}
            
            {/* Поля для преподавателя */}
            {(user.role === 'teacher' || currentRole === 'teacher') && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium">{t('teacher.details', 'Информация о преподавателе')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Специализация */}
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('teacher.specialty', 'Специализация')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Опыт работы */}
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('teacher.experience', 'Опыт (лет)')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min={0} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            {/* Поля для админа и директора */}
            {((user.role === 'admin' || currentRole === 'admin') || 
               (user.role === 'director' || currentRole === 'director')) && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium">{t('admin.details', 'Информация о сотруднике')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Должность */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.title', 'Должность')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Отдел */}
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.department', 'Отдел')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Организация */}
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.organization', 'Организация')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
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

export default EditUserProfileModal;