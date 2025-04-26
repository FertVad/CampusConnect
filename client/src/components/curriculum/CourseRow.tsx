import React from "react";
import { WeekCell } from "@/utils/calendar";
import { format, differenceInWeeks } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { ActivityType, ACTIVITY_COLORS, weekGradient } from "./WeekActivityDialog";

// Интерфейс курса
interface Course {
  id: number;
  name: string;
  startDate: Date;
}

// Интерфейс для ячейки данных
interface CellInfo {
  courseId: number;
  weekNumber: number;
  monthName: string;
  value: ActivityType;
}

interface CourseRowProps {
  course: Course;
  weeks: WeekCell[];
  tableData: Record<string, ActivityType>;
  selectedCellKey: string | null;
  onCellClick: (info: CellInfo) => void;
  isSemesterBoundary: (date: Date) => boolean;
}

export function CourseRow({
  course,
  weeks,
  tableData,
  selectedCellKey,
  onCellClick,
  isSemesterBoundary
}: CourseRowProps) {
  // Функция для генерации ключа ячейки
  const getCellKey = (courseId: number, weekNumber: number): string => {
    return `course${courseId}_week${weekNumber}`;
  };
  
  // Рассчитываем смещение недель для этого курса
  const blank = Math.max(0, differenceInWeeks(course.startDate, weeks[0].startDate));
  
  return (
    <tr key={`course-${course.id}`} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/70">
      <td className="sticky left-0 z-20 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 font-medium border-r-2 border-r-slate-600 text-center shadow-md">
        {course.name || `Курс ${course.id}`}
      </td>
      
      {/* Если есть смещение, добавляем затененные ячейки */}
      {blank > 0 && (
        <td 
          key={`blank-${course.id}`}
          colSpan={blank}
          className="p-0 h-8 bg-slate-900/10 dark:bg-slate-900/30 border-0"
        />
      )}
      
      {/* Отображаем только недели после начала курса */}
      {weeks.slice(blank).map((w, relativeIdx) => {
        const idx = relativeIdx + blank; // Абсолютный индекс недели
        const weekNumber = w.index;
        const cellKey = getCellKey(course.id, weekNumber);
        const activity = tableData[cellKey] || "";
        const isSelected = cellKey === selectedCellKey;
        
        // Неделя пересекает границу месяца?
        const crossMonth = w.startDate.getMonth() !== w.endDate.getMonth();
        
        // Базовый стиль ячейки в зависимости от чётности группы
        const isEvenGroup = idx % 8 < 4;
        
        // Градиенты для четных и нечетных столбцов
        const baseLeft = isEvenGroup ? 'from-slate-50' : 'from-white';
        const baseRight = isEvenGroup ? 'to-slate-100' : 'to-slate-50';
        const darkLeft = isEvenGroup ? 'dark:from-slate-900' : 'dark:from-slate-950';
        const darkRight = isEvenGroup ? 'dark:to-slate-800' : 'dark:to-slate-900';
        
        // Шахматный фон для обычных ячеек
        const chessBg = isEvenGroup
          ? 'bg-slate-50/50 dark:bg-slate-900/50'
          : 'bg-white dark:bg-slate-950/40';
        
        // Градиентный фон для недель на стыке месяцев
        const gradientBg = `bg-gradient-to-r ${baseLeft} ${baseRight} ${darkLeft} ${darkRight}`;
        
        // Граница правее, если следующая неделя от другого месяца
        const isMonthBoundary = idx === weeks.length - 1 || 
          (idx + 1 < weeks.length && w.endDate.getMonth() !== weeks[idx + 1].startDate.getMonth());
        
        return (
          <td 
            key={`cell-${cellKey}`}
            className={`p-0 h-8 text-center cursor-pointer transition-colors
              ${isMonthBoundary ? 'border-r-2 border-slate-300 dark:border-slate-600' : ''}
              ${isSemesterBoundary(w.startDate) || isSemesterBoundary(w.endDate) ? 
                'border-r-4 border-indigo-600 dark:border-indigo-400' : ''}
              ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
              ${!activity ? (crossMonth ? gradientBg : chessBg) : ''}
              hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-[-2px]
            `}
            style={activity ? { background: weekGradient(activity) } : {}}
            onClick={() => onCellClick({
              courseId: course.id,
              weekNumber,
              monthName: w.month,
              value: activity
            })}
            title={`Неделя ${weekNumber}: ${format(w.startDate, 'd MMM', {locale: ru})} – ${format(w.endDate, 'd MMM', {locale: ru})}\n${activity ? `Активности: ${activity}` : 'Нет активностей'}`}
          >
            {/* Для краткости отображаем только количество разных активностей */}
            {activity && activity.length > 1 ? (
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                {activity[0]}
                <span className="text-[10px] ml-0.5">+{activity.length-1}</span>
              </span>
            ) : (
              <span className={`font-bold text-sm ${activity ? 'text-slate-700 dark:text-slate-200' : ''}`}>
                {activity || ""}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}