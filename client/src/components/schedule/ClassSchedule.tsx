import React, { useState } from 'react';
import { ScheduleItem, Subject, User } from '@shared/schema';
import { formatTime, getDayName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, MapPin, User as UserIcon } from 'lucide-react';

// Расширенные типы для обработки данных API
interface SubjectWithTeacher extends Subject {
  teacher?: User;
}

interface ScheduleItemWithSubject extends ScheduleItem {
  subject: SubjectWithTeacher;
}

interface ClassScheduleProps {
  scheduleItems: ScheduleItemWithSubject[];
}

const ClassSchedule: React.FC<ClassScheduleProps> = ({ scheduleItems }) => {
  const [activeDay, setActiveDay] = useState<string>('1'); // Default to Monday
  
  // Group schedule items by day
  const scheduleByDay = scheduleItems.reduce<Record<string, ScheduleItemWithSubject[]>>(
    (acc, item) => {
      const day = item.dayOfWeek.toString();
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(item);
      return acc;
    },
    {}
  );
  
  // Sort schedule items by start time for each day
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[day].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  });
  
  const days = [
    { value: '1', label: 'Понедельник' },
    { value: '2', label: 'Вторник' },
    { value: '3', label: 'Среда' },
    { value: '4', label: 'Четверг' },
    { value: '5', label: 'Пятница' },
    { value: '0', label: 'Воскресенье' },
    { value: '6', label: 'Суббота' },
  ];
  
  // Check if there are any schedule items for a day
  const hasScheduleForDay = (day: string) => {
    return scheduleByDay[day] && scheduleByDay[day].length > 0;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-100">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h2 className="text-lg font-medium font-heading text-neutral-700">Расписание занятий</h2>
      </div>
      
      <Tabs defaultValue={activeDay} onValueChange={setActiveDay}>
        <div className="p-4">
          <TabsList className="w-full justify-start space-x-1 overflow-x-auto flex whitespace-nowrap">
            {days.map((day) => (
              <TabsTrigger 
                key={day.value} 
                value={day.value}
                className="relative"
              >
                {day.label}
                {hasScheduleForDay(day.value) && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full"></span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        <div className="px-6 py-4">
          {days.map((day) => (
            <TabsContent key={day.value} value={day.value} className="space-y-4">
              {!hasScheduleForDay(day.value) ? (
                <div className="text-center p-8 text-neutral-500">
                  Нет занятий на {day.label}
                </div>
              ) : (
                scheduleByDay[day.value].map((item, index) => (
                  <div key={index} className="flex items-center p-3 hover:bg-neutral-50 rounded-lg transition-all">
                    <div className="bg-primary-light bg-opacity-20 rounded-lg p-3 mr-4">
                      <Book className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-neutral-700">{item.subject.name}</h3>
                      <div className="flex flex-wrap gap-x-4 text-xs text-neutral-500 mt-1">
                        <div className="flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {item.subject.teacher 
                            ? `${item.subject.teacher.firstName} ${item.subject.teacher.lastName}` 
                            : 'Не назначен'}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {item.roomNumber || item.subject.roomNumber || 'Кабинет не указан'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-700">
                        {formatTime(item.startTime)} - {formatTime(item.endTime)}
                      </p>
                      <p className="text-xs text-neutral-500">{getDayName(item.dayOfWeek)}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default ClassSchedule;
