import React from "react";
import { WeekCell, buildAcademicWeeks } from "@/utils/calendar";
import { format, getWeek, differenceInWeeks } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { ActivityType, ACTIVITY_COLORS, ACTIVITY_TYPES, weekGradient } from "./ActivityTypes";
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
  selectedCells?: Set<string>; // Добавляем поддержку для множественного выделения
  onCellClick: (info: CellInfo, event: React.MouseEvent) => void;
  isLastDayOfMonth: (date: Date) => boolean;
  startDate: Date; // Дата начала для этого курса
}

export function CourseRow({
  course,
  weeks,
  courseWeeks,
  tableData,
  selectedCellKey,
  selectedCells = new Set(),
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
      const startMonthNum = weekInCourse.startDate.getMonth();
      const endMonthNum = weekInCourse.endDate.getMonth();
      const crossMonth = startMonthNum !== endMonthNum;
      
      // Определяем месяц для шахматного порядка (четный/нечетный месяц)
      const startMonthName = format(weekInCourse.startDate, "LLLL", { locale: ru });
      
      // Используем фактический месяц (0-11) для определения четности/нечетности
      // Обратите внимание, что getMonth() возвращает 0 для января, 1 для февраля и т.д.
      const monthIndex = startMonthNum;
      
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
      
      // Проверяем, заканчивается ли месяц в этой неделе
      const isMonthEnd = isLastDayOfMonth(weekInCourse.endDate);
      
      // Базовый класс ячейки без фонового цвета
      const baseCellClass = `p-0 h-8 text-center cursor-pointer transition-colors
        ${isMonthEnd ? 'border-r border-slate-500/15 dark:border-slate-500/10' : ''}
        hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-[-2px]`;
      
      // Используем импортированные цвета из модуля ActivityTypes
      let backgroundStyle = '';
      
      if (activity) {
        console.log(`Ячейка ${cellKey} с активностью ${activity}`);
        
        if (activity.length === 1 && activity in ACTIVITY_COLORS) {
          // Для одиночной активности используем сплошной цвет
          backgroundStyle = ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS].color;
          console.log(`[${cellKey}] Цвет для активности ${activity}: ${backgroundStyle}`);
        } else if (activity.length > 1) {
          // Для комбинированных активностей используем градиент
          backgroundStyle = weekGradient(activity);
          console.log(`[${cellKey}] Градиент для комбо-активности ${activity}: ${backgroundStyle}`);
        }
      } else if (crossMonth) {
        // Для пустых ячеек, пересекающих месяцы, создаем плавный градиент
        // Вместо сложных градиентов используем наложение двух фонов с режимом смешивания
        // Определяем цвета для текущего и следующего месяца
        const currentMonthColor = monthIndex % 2 === 0 ? 'var(--month-even)' : 'var(--month-odd)';
        const nextMonthColor = monthIndex % 2 === 0 ? 'var(--month-odd)' : 'var(--month-even)';
        
        // Рассчитываем пропорцию дней в каждом месяце (насколько дней от месяца находятся в этой неделе)
        const totalDays = daysInCurrentMonth + daysInNextMonth;
        const firstMonthPercent = Math.round((daysInCurrentMonth / totalDays) * 100);
        
        // Используем максимально плавный градиент с большим количеством промежуточных точек
        // Создаем градиент с очень постепенным переходом
        const width = 30; // Ширина перехода в процентах (чем больше, тем плавнее)
        
        // Создаем более плавный многоточечный градиент
        backgroundStyle = `linear-gradient(90deg, 
          ${currentMonthColor} 0%,
          ${currentMonthColor} ${Math.max(0, firstMonthPercent-width)}%,
          ${currentMonthColor} ${Math.max(0, firstMonthPercent-width/1.5)}%,
          ${currentMonthColor} ${Math.max(0, firstMonthPercent-width/2)}%,
          ${currentMonthColor} ${Math.max(0, firstMonthPercent-width/3)}%,
          ${nextMonthColor} ${Math.min(100, firstMonthPercent+width/3)}%,
          ${nextMonthColor} ${Math.min(100, firstMonthPercent+width/2)}%,
          ${nextMonthColor} ${Math.min(100, firstMonthPercent+width/1.5)}%,
          ${nextMonthColor} ${Math.min(100, firstMonthPercent+width)}%,
          ${nextMonthColor} 100%)`;
          
        console.log(`[${cellKey}] Многоточечный плавный градиент: ${backgroundStyle}, дней: ${daysInCurrentMonth}/${daysInNextMonth} (${firstMonthPercent}%)`);
      }
      
      // Создаем стиль для ячейки и логируем значение
      const style = backgroundStyle ? 
        { background: backgroundStyle } 
        : undefined;
      console.log(`Стиль для ${cellKey}: `, style);
      
      cells.push(
        <td 
          key={`cell-${cellKey}`}
          className={`${baseCellClass} week-cell
            ${crossMonth ? '--split-month' : ''} 
            ${selectedCells && cellKey && selectedCells.has(cellKey) ? 'selected' : ''}`}
          data-cell-key={cellKey}
          data-month-odd={monthIndex % 2}
          style={style}
          onClick={(event) => onCellClick({
            courseId: course.id,
            weekNumber,
            monthName: weekInCourse.month,
            value: activity,
            startDate: weekInCourse.startDate,
            endDate: weekInCourse.endDate
          }, event)}
          data-tooltip-id="calendar-tooltip"
          data-tooltip-html={`
            <div class="font-medium">Уч. неделя ${weekNumber}</div>
            <div class="text-slate-400 text-sm">${format(weekInCourse.startDate, 'd MMM', {locale: ru})} – ${format(weekInCourse.endDate, 'd MMM', {locale: ru})}</div>
            <div class="mt-2 text-sm">
              ${activity ? (() => {
                // Создаем объект с днями недели
                const days: Record<string, string> = {};
                const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                
                // Заполняем объект для каждого дня
                activity.split('').forEach((char, i) => {
                  if (char && char.trim()) {
                    days[dayNames[i]] = char;
                  }
                });
                
                // Проверяем, все ли дни имеют одинаковую активность
                const uniqueActivities = Array.from(new Set(Object.values(days)));
                
                // Если все дни одинаковые и есть хотя бы один день с активностью
                if (uniqueActivities.length === 1 && uniqueActivities[0] && Object.keys(days).length > 0) {
                  const activity = uniqueActivities[0];
                  const colorClass = activity in ACTIVITY_COLORS ? 
                    ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS].color : 
                    '#d1d5db';
                  const activityName = activity in ACTIVITY_TYPES ? 
                    ACTIVITY_TYPES[activity as keyof typeof ACTIVITY_TYPES] : 
                    'Активность';
                  
                  return `
                    <div class="flex items-center my-1">
                      <span style="background-color: ${colorClass}; width: 0.75rem; height: 0.75rem; display: inline-block; border-radius: 0.125rem; margin-right: 0.25rem;"></span>
                      <span>${activityName} — вся неделя (${activity})</span>
                    </div>
                  `;
                } 
                // Иначе отображаем по дням (только непустые дни)
                else {
                  return Object.entries(days).map(([day, char]) => {
                    if (!char) return '';
                    
                    const colorClass = char in ACTIVITY_COLORS ? 
                      ACTIVITY_COLORS[char as keyof typeof ACTIVITY_COLORS].color : 
                      '#d1d5db';
                    
                    return `
                      <div class="flex items-center my-0.5">
                        <span style="background-color: ${colorClass}; width: 0.75rem; height: 0.75rem; display: inline-block; border-radius: 0.125rem; margin-right: 0.25rem;"></span>
                        <span>${day} — ${char}</span>
                      </div>
                    `;
                  }).join('');
                }
              })() : '<div>Нет активности</div>'}
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