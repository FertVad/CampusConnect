import React from "react";
import { WeekCell, buildAcademicWeeks } from "@/utils/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { ActivityType, ACTIVITY_COLORS, ACTIVITY_TYPES, weekGradient } from "./ActivityTypes";

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
  tableData: Record<string, ActivityType>;
  selectedCells?: Set<string>; // Добавляем поддержку для множественного выделения
  onCellClick: (info: CellInfo, event: React.MouseEvent) => void;
  isLastDayOfMonth: (date: Date) => boolean;
  startDate: Date; // Дата начала для этого курса
}

// Функция для внутреннего использования
function CourseRow({
  course,
  tableData,
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
  // Может быть до 53 недель в зависимости от даты
  const weeksForCourse = buildAcademicWeeks(startDate, 1);
  
  // Используем фактическое количество недель из построенного массива (обычно 52, но может быть 53)
  const courseLen = weeksForCourse.length;
  
  // Рендер ячеек для текущего курса
  const renderCells = () => {
    const cells: React.ReactNode[] = [];
    
    // Проходим по всем неделям курса (до 53 недель)
    for (let idx = 0; idx < courseLen && idx < weeksForCourse.length; idx++) {
      const weekInCourse = weeksForCourse[idx];
      const weekNumber = weekInCourse.index;
      const cellKey = getCellKey(course.id, weekNumber);
      const activity = tableData[cellKey] || "";
      
      // Неделя пересекает границу месяца?
      const startMonthNum = weekInCourse.startDate.getMonth();
      const endMonthNum = weekInCourse.endDate.getMonth();
      const crossMonth = startMonthNum !== endMonthNum;
      
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
      const baseCellClass = `p-0 h-8 text-center cursor-pointer transition-colors border-r border-slate-700
        ${isMonthEnd ? 'border-r-2 border-r-slate-600' : ''}
        hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-[-2px]`;
      
      // Используем импортированные цвета из модуля ActivityTypes
      let backgroundStyle = '';
      
      if (activity) {
        // Убираем лишние логи или оборачиваем их проверкой окружения
        if (process.env.NODE_ENV === "development" && false) { // Отключаем все логи
        }
        
        if (activity.length === 1 && activity in ACTIVITY_COLORS) {
          // Для одиночной активности используем сплошной цвет
          backgroundStyle = ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS].color;
        } else if (activity.length > 1) {
          // Для комбинированных активностей используем градиент
          backgroundStyle = weekGradient(activity);
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
          
        if (process.env.NODE_ENV === "development" && false) { // Отключаем все логи
        }
      }
      
      // Создаем стиль для ячейки без логирования
      const style = backgroundStyle ? 
        { background: backgroundStyle } 
        : undefined;
      
      cells.push(
        <td 
          key={`cell-${cellKey}`}
          className={`${baseCellClass} week-cell w-[40px] p-0 h-[38px]
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
    <tr className="border-b border-slate-600 hover:bg-slate-800/70">
      <td className="sticky left-0 z-20 bg-slate-800 text-white px-3 py-2 font-medium border-r border-slate-600 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)] max-w-[200px] truncate">
        {course.name || `Курс ${course.id}`}
      </td>
      {renderCells()}
    </tr>
  );
}

// Оптимизируем компонент с помощью React.memo для предотвращения лишних рендеров
// Экспортируем обернутую версию с расширенной функцией сравнения
export default React.memo(CourseRow, 
  (prev, next) => {
    // Основные критерии - объекты должны быть равны по ссылке
    if (
      prev.tableData !== next.tableData || 
      prev.selectedCells !== next.selectedCells
    ) {
      return false; // Гарантированно должны перерендерить
    }
    
    // Проверяем изменились ли важные внутренние свойства курса
    if (
      prev.course.id !== next.course.id ||
      prev.startDate.getTime() !== next.startDate.getTime()
    ) {
      return false;
    }
    
    // Проверка на изменение в выделении, которое затрагивает этот курс
    const prevSelectedKeys = Array.from(prev.selectedCells || [])
      .filter(key => key.includes(`course${prev.course.id}`));
    const nextSelectedKeys = Array.from(next.selectedCells || [])
      .filter(key => key.includes(`course${next.course.id}`));
    
    if (prevSelectedKeys.length !== nextSelectedKeys.length) {
      return false;
    }
    
    // Если все проверки пройдены - можно пропустить ререндер
    return true;
  }
);