import React from "react";
import { WeekCell, buildAcademicWeeks } from "@/utils/calendar";
import { format, getWeek, differenceInWeeks } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { ActivityType, ACTIVITY_COLORS, ACTIVITY_TYPES, weekGradient, monthTransitionGradient } from "./WeekActivityDialog";
import { Tooltip } from "react-tooltip";

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
  weeks: WeekCell[]; // Общие недели для заголовков (первый курс)
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
  
  // Строим собственный массив недель для курса - начиная с его стартовой даты
  // Всегда создаем ровно один год (52 недели) от даты старта
  const weeksForCourse = buildAcademicWeeks(startDate, 1);
  
  // Определяем длину курса в неделях - сейчас фиксированно 52 недели
  const courseLen = 52;
  
  // Рендер ячеек для текущего курса
  const renderCells = () => {
    const cells: React.ReactNode[] = [];
    
    // Проходим по всем неделям курса, беря 52 недели без смещений
    for (let idx = 0; idx < courseLen && idx < weeksForCourse.length; idx++) {
      const weekInCourse = weeksForCourse[idx];
      const weekNumber = weekInCourse.index;
      const cellKey = getCellKey(course.id, weekNumber);
      const activity = tableData[cellKey] || "";
      const isSelected = cellKey === selectedCellKey;
      
      // Неделя пересекает границу месяца?
      const crossMonth = weekInCourse.startDate.getMonth() !== weekInCourse.endDate.getMonth();
      
      // Определяем месяц для шахматного порядка (четный/нечетный месяц)
      const startMonth = format(weekInCourse.startDate, "LLLL", { locale: ru });
      
      // Пытаемся определить индекс месяца в порядке учебного года (сентябрь = 0)
      const monthNames = ["сентябрь", "октябрь", "ноябрь", "декабрь", "январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август"];
      let monthIndex = monthNames.indexOf(startMonth.toLowerCase());
      monthIndex = monthIndex === -1 ? weekInCourse.startDate.getMonth() : monthIndex;
      
      const isEvenMonth = monthIndex % 2 === 0;
      
      // Вычисляем количество дней в текущем месяце и в следующем
      let daysInCurrentMonth = 0;
      let daysInNextMonth = 0;
      
      if (crossMonth) {
        // Рассчитываем количество дней в текущем месяце
        const lastDayOfMonth = new Date(weekInCourse.startDate.getFullYear(), weekInCourse.startDate.getMonth() + 1, 0);
        daysInCurrentMonth = lastDayOfMonth.getDate() - weekInCourse.startDate.getDate() + 1;
        
        // Рассчитываем количество дней в следующем месяце
        daysInNextMonth = weekInCourse.endDate.getDate();
      }
      
      // Шахматный фон для обычных ячеек
      const chessBg = isEvenMonth
        ? 'bg-slate-100 dark:bg-slate-800'
        : 'bg-slate-200 dark:bg-slate-700';
      
      // Градиентный фон для недель на стыке месяцев
      let gradientStyle = {};
      if (crossMonth) {
        // Проверяем темный режим
        const isDarkMode = window.matchMedia && 
                         window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Используем нашу функцию для создания градиента
        const gradientBackground = monthTransitionGradient(
          daysInCurrentMonth,
          daysInNextMonth,
          isEvenMonth,
          isDarkMode
        );
        
        // Устанавливаем стиль
        gradientStyle = {
          background: gradientBackground
        };
      }
      
      // Проверяем, заканчивается ли месяц в этой неделе
      const isMonthEnd = isLastDayOfMonth(weekInCourse.endDate);
      
      // Базовый класс ячейки без фонового цвета
      const baseCellClass = `p-0 h-8 text-center cursor-pointer transition-colors
        ${isMonthEnd ? 'border-r border-slate-500/15 dark:border-slate-500/10' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-[-2px]`;
      
      // Класс фона в зависимости от месяца
      const monthBg = !activity && !crossMonth ? chessBg : '';
      
      // Определяем стиль для ячейки
      const style = activity 
        ? { background: weekGradient(activity) } 
        : (crossMonth ? gradientStyle : undefined);
      
      cells.push(
        <td 
          key={`cell-${cellKey}`}
          className={`${baseCellClass} ${!activity && !crossMonth ? monthBg : ''}`}
          style={style}
          onClick={() => onCellClick({
            courseId: course.id,
            weekNumber,
            monthName: weekInCourse.month,
            value: activity,
            startDate: weekInCourse.startDate,
            endDate: weekInCourse.endDate
          })}
          data-tooltip-id="calendar-tooltip"
          data-tooltip-html={`
            <div class="font-medium">Кал. неделя ${getWeek(weekInCourse.startDate)} | Уч. неделя ${weekNumber}</div>
            <div class="text-slate-400 text-sm">${format(weekInCourse.startDate, 'd MMM', {locale: ru})} – ${format(weekInCourse.endDate, 'd MMM', {locale: ru})}</div>
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
    }
    
    return cells;
  };
  
  return (
    <tr className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/70">
      <td className="sticky left-0 z-20 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 font-medium border-r-2 border-r-slate-600 text-center shadow-md">
        {course.name || `Курс ${course.id}`}
      </td>
      {renderCells()}
    </tr>
  );
}