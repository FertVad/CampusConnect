import React, { useState } from 'react';
import { ScheduleItem, Subject, User } from '@shared/schema';
import { formatTime, getDayName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, MapPin, User as UserIcon } from 'lucide-react';

// Расширенные типы для обработки данных API
export interface SubjectWithTeacher extends Subject {
  teacher?: User;
}

export interface ScheduleItemWithSubject extends ScheduleItem {
  subject: SubjectWithTeacher;
  teacherName?: string;
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
                  <div key={index} className="flex items-center p-4 hover:bg-neutral-50 rounded-lg transition-all border border-gray-100 mb-2">
                    <div className="bg-primary-light bg-opacity-20 rounded-lg p-3 mr-4 flex-shrink-0">
                      <Book className="h-6 w-6 text-primary" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 flex-1">
                      <div className="col-span-2">
                        <h3 className="text-sm font-medium text-neutral-700">{item.subject.name}</h3>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="flex items-center text-xs text-neutral-500">
                            <UserIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {item.teacherName || (item.subject.teacher 
                                ? `${item.subject.teacher.firstName} ${item.subject.teacher.lastName}` 
                                : 'Не назначен')}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-neutral-500">
                            <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {item.roomNumber || item.subject.roomNumber || 'Кабинет не указан'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <p className="text-sm font-medium text-neutral-700">
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">{getDayName(item.dayOfWeek)}</p>
                      </div>
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
