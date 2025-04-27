import React from "react";
import { WeekCell } from "@/utils/calendar";
import { format, getWeek, differenceInWeeks } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { ActivityType, ACTIVITY_COLORS, ACTIVITY_TYPES, weekGradient } from "./WeekActivityDialog";
import { Tooltip } from "react-tooltip";

// Функция для определения класса цвета активности для тултипа
const getActivityColorClass = (activity: ActivityType): string => {
  if (!activity || activity === '') return 'bg-gray-300';
  
  if (activity in ACTIVITY_COLORS) {
    const colorObj = ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS];
    return colorObj.bg;
  }
  
  return 'bg-gray-300';
};

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
  weeks: WeekCell[]; // Общие недели для заголовков
  courseWeeks: WeekCell[]; // Недели специфичные для этого курса
  tableData: Record<string, ActivityType>;
  selectedCellKey: string | null;
  onCellClick: (info: CellInfo) => void;
  isLastDayOfMonth: (date: Date) => boolean;
  startDate: Date; // Дата начала для этого курса
}

export function CourseRow({
  course,
  weeks,
  courseWeeks,
  tableData,
  selectedCellKey,
  onCellClick,
  isLastDayOfMonth,
  startDate
}: CourseRowProps) {
  // Функция для генерации ключа ячейки
  const getCellKey = (courseId: number, weekNumber: number): string => {
    return `course${courseId}_week${weekNumber}`;
  };
  
  // Рассчитываем смещение в неделях между глобальными неделями и неделями курса
  const offset = differenceInWeeks(startDate, weeks[0].startDate);
  
  return (
    <tr key={`course-${course.id}`} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/70">
      <td className="sticky left-0 z-20 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 font-medium border-r-2 border-r-slate-600 text-center shadow-md">
        {course.name || `Курс ${course.id}`}
      </td>
      
      {/* Если есть смещение, добавляем пустую ячейку с colspan */}
      {offset > 0 && (
        <td 
          colSpan={offset}
          className="bg-slate-300/30 dark:bg-slate-700/30"
        ></td>
      )}
      
      {/* Отображаем недели для курса, учитывая смещение */}
      {courseWeeks.slice(0, weeks.length - offset).map((w, idx) => {
        // Глобальная неделя в календаре (для правильного отображения)
        const globalWeekIdx = idx + offset;
        if (globalWeekIdx >= weeks.length) return null; // Не показываем недели за пределами видимой области
        
        const globalWeek = weeks[globalWeekIdx];
        const weekNumber = w.index;
        const cellKey = getCellKey(course.id, weekNumber);
        const activity = tableData[cellKey] || "";
        const isSelected = cellKey === selectedCellKey;
        
        // Неделя пересекает границу месяца?
        const crossMonth = globalWeek.startDate.getMonth() !== globalWeek.endDate.getMonth();
        
        // Определяем месяц для шахматного порядка (четный/нечетный месяц)
        const startMonth = format(globalWeek.startDate, "LLLL", { locale: ru });
        
        // Пытаемся определить индекс месяца в порядке учебного года (сентябрь = 0)
        const monthNames = ["сентябрь", "октябрь", "ноябрь", "декабрь", "январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август"];
        let monthIndex = monthNames.indexOf(startMonth.toLowerCase());
        monthIndex = monthIndex === -1 ? globalWeek.startDate.getMonth() : monthIndex;
        
        const isEvenMonth = monthIndex % 2 === 0;
        
        // Вычисляем количество дней в текущем месяце и в следующем
        let daysInCurrentMonth = 0;
        let daysInNextMonth = 0;
        
        if (crossMonth) {
            // Рассчитываем количество дней в текущем месяце
            const lastDayOfMonth = new Date(globalWeek.startDate.getFullYear(), globalWeek.startDate.getMonth() + 1, 0);
            daysInCurrentMonth = lastDayOfMonth.getDate() - globalWeek.startDate.getDate() + 1;
            
            // Рассчитываем количество дней в следующем месяце
            daysInNextMonth = globalWeek.endDate.getDate();
        }
        
        // Шахматный фон для обычных ячеек
        const chessBg = isEvenMonth
          ? 'bg-slate-100 dark:bg-slate-800'
          : 'bg-slate-200 dark:bg-slate-700';
        
        // Градиентный фон для недель на стыке месяцев
        let gradientStyle = {};
        if (crossMonth) {
            // Рассчитываем проценты для градиента на основе реального количества дней
            const totalDays = daysInCurrentMonth + daysInNextMonth;
            const currentMonthPercent = (daysInCurrentMonth / totalDays) * 100;
            
            // Создаем стиль с плавным градиентом, используя точные проценты
            gradientStyle = {
                background: `linear-gradient(to right,
                ${isEvenMonth ? '#f1f5f9' : '#e2e8f0'} 0%,
                ${isEvenMonth ? '#f1f5f9' : '#e2e8f0'} ${currentMonthPercent}%,
                ${!isEvenMonth ? '#f1f5f9' : '#e2e8f0'} 100%)`,
            };
            
            // То же самое для темной темы
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                gradientStyle = {
                    background: `linear-gradient(to right,
                    ${isEvenMonth ? '#1e293b' : '#334155'} 0%,
                    ${isEvenMonth ? '#1e293b' : '#334155'} ${currentMonthPercent}%,
                    ${!isEvenMonth ? '#1e293b' : '#334155'} 100%)`,
                };
            }
        }
        
        // Проверяем, заканчивается ли месяц в этой неделе
        const isMonthEnd = isLastDayOfMonth(globalWeek.endDate);
        
        return (
          <td 
            key={`cell-${cellKey}`}
            className={`p-0 h-8 text-center cursor-pointer transition-colors
              ${isMonthEnd ? 'border-r border-slate-500/15 dark:border-slate-500/10' : ''}
              ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
              ${!activity && !crossMonth ? chessBg : ''}
              hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-[-2px]
            `}
            style={activity ? { background: weekGradient(activity) } : (crossMonth ? gradientStyle : {})}
            onClick={() => onCellClick({
              courseId: course.id,
              weekNumber,
              monthName: w.month,
              value: activity,
              startDate: w.startDate,
              endDate: w.endDate
            })}
            data-tooltip-id="calendar-tooltip"
            data-tooltip-html={`
              <div class="font-medium">Кал. неделя ${getWeek(w.startDate)} | Уч. неделя ${weekNumber}</div>
              <div class="text-slate-400 text-sm">${format(w.startDate, 'd MMM', {locale: ru})} – ${format(w.endDate, 'd MMM', {locale: ru})}</div>
              <div class="mt-2 text-sm">
                ${activity ? activity.split('').map((char, i) => {
                  const day = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i];
                  const colorClass = char in ACTIVITY_COLORS ? 
                    ACTIVITY_COLORS[char as keyof typeof ACTIVITY_COLORS].color : 
                    '#d1d5db';
                  return `
                    <div class="flex items-center my-0.5">
                      <span style="background-color: ${colorClass}; width: 0.75rem; height: 0.75rem; display: inline-block; border-radius: 0.125rem; margin-right: 0.25rem;"></span>
                      <span>${day} — ${char || "—"}</span>
                    </div>
                  `;
                }).join('') : '<div>Нет активности</div>'}
              </div>
            `}
          >
            {/* Для краткости отображаем только количество разных активностей */}
            {activity && activity.length > 1 ? (
              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                {activity[0]}
                <span className="text-[10px] ml-0.5">+{activity.length-1}</span>
              </span>
            ) : (
              <span className={`font-semibold text-sm ${activity ? 'text-slate-900 dark:text-slate-100' : ''}`}>
                {activity || ""}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}