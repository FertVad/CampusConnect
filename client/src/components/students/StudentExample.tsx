import React from 'react';
import StudentCard, { Student } from './StudentCard';
import { useToast } from '@/hooks/use-toast';

// Пример данных студента для тестирования
const mockStudent: Student = {
  id: 1,
  firstName: 'Алексей',
  lastName: 'Иванов',
  email: 'alexey.ivanov@example.com',
  phone: '+7 (999) 123-45-67',
  group: 'ИС-101',
  major: 'Информатика и ВТ',
  course: 3,
  lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 дня назад
  tasksOpen: 5,
  tasksDone: 12,
  unreadNotifications: 3,
  averageGrade: 87,
  missedClasses: 2,
  note: 'Активно участвует в студенческих мероприятиях. Проявляет лидерские качества. Рекомендуется для участия в научной конференции.'
};

// Второй студент для демонстрации вариантов
const mockStudent2: Student = {
  id: 2,
  firstName: 'Екатерина',
  lastName: 'Смирнова',
  email: 'kat.smirnova@example.com',
  group: 'ЭК-202',
  major: 'Экономика',
  course: 2,
  lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 час назад
  tasksOpen: 3,
  tasksDone: 8,
  unreadNotifications: 0,
  averageGrade: 92,
  missedClasses: 0
};

// Пример студента с низкой успеваемостью
const mockStudent3: Student = {
  id: 3,
  firstName: 'Дмитрий',
  lastName: 'Петров',
  email: 'dima.petrov@example.com',
  phone: '+7 (999) 987-65-43',
  group: 'ИС-101',
  major: 'Информатика и ВТ',
  course: 3,
  tasksOpen: 10,
  tasksDone: 3,
  unreadNotifications: 7,
  averageGrade: 65,
  missedClasses: 8,
  note: 'Требуется дополнительное внимание. Назначена консультация.'
};

const StudentExample: React.FC = () => {
  const { toast } = useToast();

  const handleStudentClick = (id: number) => {
    toast({
      title: 'Студент выбран',
      description: `Вы выбрали студента с ID: ${id}`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-2xl font-bold mb-6">Карточки студентов (пример)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StudentCard student={mockStudent} onClick={handleStudentClick} />
        <StudentCard student={mockStudent2} onClick={handleStudentClick} />
        <StudentCard student={mockStudent3} onClick={handleStudentClick} />
      </div>
    </div>
  );
};

export default StudentExample;