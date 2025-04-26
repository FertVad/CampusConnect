import React from "react";
import { WeekCell } from "@/utils/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { ActivityType, ACTIVITY_COLORS, weekGradient } from "./WeekActivityDialog";

// Интерфейс курса
interface Course {
  id: number;
  name: string;
  startDate: Date;
  weeks?: WeekCell[]; // Массив недель для этого курса
}

// Интерфейс для ячейки данных
interface CellInfo {
  courseId: number;
  weekNumber: number;
  monthName: string;
  value: ActivityType;
  startDate: Date; // Дата начала недели
  endDate: Date;   // Дата конца недели
}

interface CourseRowProps {
  course: Course;
  weeks: WeekCell[];
  tableData: Record<string, ActivityType>;
  selectedCellKey: string | null;
  onCellClick: (info: CellInfo) => void;
  isLastDayOfMonth: (date: Date) => boolean;
}

export function CourseRow({
  course,
  weeks,
  tableData,
  selectedCellKey,
  onCellClick,
  isLastDayOfMonth
}: CourseRowProps) {
  // Функция для генерации ключа ячейки
  const getCellKey = (courseId: number, weekNumber: number): string => {
    return `course${courseId}_week${weekNumber}`;
  };
  
  // Каждый курс начинается с первой ячейки в таблице
  // Для этого мы не применяем смещение (убран расчет blank)
  
  return (
    <tr key={`course-${course.id}`} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/70">
      <td className="sticky left-0 z-20 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 font-medium border-r-2 border-r-slate-600 text-center shadow-md">
        {course.name || `Курс ${course.id}`}
      </td>
      
      {/* Отображаем все недели для каждого курса */}
      {weeks.map((w, idx) => {
        const weekNumber = w.index;
        const cellKey = getCellKey(course.id, weekNumber);
        const activity = tableData[cellKey] || "";
        const isSelected = cellKey === selectedCellKey;
        
        // Неделя пересекает границу месяца?
        const crossMonth = w.startDate.getMonth() !== w.endDate.getMonth();
        
        // Определяем стили на основе реального месяца, а не по чередованию
        const month = w.startDate.getMonth();
        const isEvenMonth = month % 2 === 0;
        
        // CSS переменные для градиентного фона
        const monthBgLeft = isEvenMonth ? 'var(--month-bg-left, #f8fafc)' : 'var(--month-bg-left, #ffffff)';
        const monthBgRight = !isEvenMonth ? 'var(--month-bg-right, #f1f5f9)' : 'var(--month-bg-right, #f8fafc)';
        
        // Градиенты для месяцев на стыке (чередуются по реальному месяцу)
        const baseLeft = isEvenMonth ? 'from-slate-100' : 'from-white';
        const baseRight = !isEvenMonth ? 'to-slate-200' : 'to-slate-100';
        const darkLeft = isEvenMonth ? 'dark:from-slate-800' : 'dark:from-slate-900';
        const darkRight = !isEvenMonth ? 'dark:to-slate-700' : 'dark:to-slate-800';
        
        // Шахматный фон для обычных ячеек
        const chessBg = isEvenMonth
          ? 'bg-slate-100 dark:bg-slate-800'
          : 'bg-white dark:bg-slate-900';
        
        // Градиентный фон для недель на стыке месяцев (50/50)
        const gradientBg = `bg-gradient-to-r ${baseLeft} ${baseRight} ${darkLeft} ${darkRight}`;
        
        // Проверяем, заканчивается ли месяц в этой неделе
        const isMonthEnd = isLastDayOfMonth(w.endDate) || 
                       (w.startDate.getMonth() !== w.endDate.getMonth() && 
                       w.endDate.getDate() >= 1);
        
        return (
          <td 
            key={`cell-${cellKey}`}
            className={`p-0 h-8 text-center cursor-pointer transition-colors
              ${isMonthEnd ? 'border-r border-slate-400/40 dark:border-slate-500/40' : 'border-x border-slate-200 dark:border-slate-700'}
              ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
              ${!activity ? (crossMonth ? gradientBg : chessBg) : ''}
              hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-[-2px]
            `}
            style={activity ? { background: weekGradient(activity) } : {}}
            onClick={() => onCellClick({
              courseId: course.id,
              weekNumber,
              monthName: w.month,
              value: activity,
              startDate: w.startDate,
              endDate: w.endDate
            })}
            title={`Учебная неделя ${weekNumber}\n${format(w.startDate, 'd MMM', {locale: ru})} – ${format(w.endDate, 'd MMM', {locale: ru})}\nПн - ${activity || "Не указано"}`}
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