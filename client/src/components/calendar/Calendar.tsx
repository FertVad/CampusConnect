import React, { useState } from 'react';
import CalendarDays from '@/components/ui/calendar-days';

interface CalendarEvent {
  date: Date;
  type: 'primary' | 'warning' | 'error';
}

interface CalendarProps {
  events?: CalendarEvent[];
  onSelectDate?: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ events = [], onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get days for current month view
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const days = [];
    
    // Add days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Add days from current month
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = 
        today.getDate() === i && 
        today.getMonth() === month && 
        today.getFullYear() === year;
      
      // Check if this day has any events
      const hasEvent = events.some(event => {
        const eventDate = new Date(event.date);
        return (
          eventDate.getDate() === i &&
          eventDate.getMonth() === month &&
          eventDate.getFullYear() === year
        );
      });
      
      // Get event type if there is an event
      let eventType: 'primary' | 'warning' | 'error' | undefined;
      if (hasEvent) {
        const event = events.find(event => {
          const eventDate = new Date(event.date);
          return (
            eventDate.getDate() === i &&
            eventDate.getMonth() === month &&
            eventDate.getFullYear() === year
          );
        });
        eventType = event?.type;
      }
      
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday,
        hasEvent,
        eventType
      });
    }
    
    // Add days from next month if needed to fill the calendar
    const totalDaysShown = 42; // 6 rows of 7 days
    const remainingDays = totalDaysShown - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    if (onSelectDate) {
      const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      onSelectDate(selectedDate);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-100">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h2 className="text-lg font-medium font-heading text-neutral-700">Calendar</h2>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button 
            className="text-neutral-500 hover:text-neutral-700"
            onClick={handlePrevMonth}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <h3 className="text-sm font-medium text-neutral-700">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button 
            className="text-neutral-500 hover:text-neutral-700"
            onClick={handleNextMonth}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          <div className="text-xs font-medium text-neutral-400">S</div>
          <div className="text-xs font-medium text-neutral-400">M</div>
          <div className="text-xs font-medium text-neutral-400">T</div>
          <div className="text-xs font-medium text-neutral-400">W</div>
          <div className="text-xs font-medium text-neutral-400">T</div>
          <div className="text-xs font-medium text-neutral-400">F</div>
          <div className="text-xs font-medium text-neutral-400">S</div>
        </div>
        
        <CalendarDays days={getCalendarDays()} onSelectDay={handleSelectDay} />
        
        <div className="mt-4 flex justify-center">
          <button className="px-2 py-1 text-xs font-medium text-primary hover:text-primary-dark">
            View Full Calendar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
