import React from 'react';
import { cn } from '@/lib/utils';

type DayInfo = {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvent?: boolean;
  eventType?: 'primary' | 'warning' | 'error';
};

interface CalendarDaysProps {
  days: DayInfo[];
  onSelectDay?: (day: number) => void;
}

const CalendarDays: React.FC<CalendarDaysProps> = ({ days, onSelectDay }) => {
  const handleDayClick = (day: DayInfo) => {
    if (day.isCurrentMonth && onSelectDay) {
      onSelectDay(day.day);
    }
  };

  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {days.map((day, index) => (
        <div
          key={index}
          className={cn(
            "text-xs p-2 relative cursor-pointer",
            !day.isCurrentMonth && "text-neutral-300",
            day.isToday && "font-medium bg-primary text-white rounded-full",
            day.isCurrentMonth && !day.isToday && "hover:bg-neutral-100"
          )}
          onClick={() => handleDayClick(day)}
        >
          {day.day}
          {day.hasEvent && !day.isToday && (
            <div 
              className={cn(
                "absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full",
                day.eventType === 'primary' && "bg-primary",
                day.eventType === 'warning' && "bg-warning",
                day.eventType === 'error' && "bg-error"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CalendarDays;
