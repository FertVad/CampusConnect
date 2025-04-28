import React, { useState, useMemo, useEffect, useCallback } from "react";
import { WeekActivityDialog, WeekInfo, ActivityType, ACTIVITY_TYPES, ACTIVITY_COLORS } from "./WeekActivityDialog";
import { Tooltip } from 'react-tooltip';
import { WeekCell, getFirstWorkdayOfSeptember, buildAcademicWeeks } from "@/utils/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SaveButton } from "@/components/ui/save-button";
import { CourseRow } from "./CourseRow";
import { X } from "lucide-react";

// Количество курсов
const NUMBER_OF_COURSES = 4;

// Тип для всех данных таблицы
type CalendarData = Record<string, ActivityType>;

// Интерфейс для ячейки данных
interface CellInfo {
  courseId: number;
  weekNumber: number;
  monthName: string;
  value: ActivityType;
  startDate: Date; // Дата начала недели
  endDate: Date;   // Дата конца недели
}

// Интерфейс для курса
interface Course {
  id: number;
  name: string;
  startDate: Date;
  weeks: WeekCell[]; // Массив недель, специфичных для этого курса
}

interface AcademicCalendarTableProps {
  weeks: WeekCell[];            // Массив недель для отображения
  yearsOfStudy: number;
  onChange?: (data: CalendarData) => void;
  initialData?: CalendarData;
  startDates?: Record<string, Date>; // Даты начала для каждого курса
}

export function AcademicCalendarTable({ 
  weeks,
  yearsOfStudy = 4, 
  onChange,
  initialData = {},
  startDates = {}
}: AcademicCalendarTableProps) {
  // Состояние для хранения данных таблицы
  const [tableData, setTableData] = useState<CalendarData>(initialData);
  
  // Используем хук автосохранения
  const { isSaving, forceSave } = useAutoSave(tableData, {
    url: '/api/curriculum/weeks',
    debounceMs: 1000,
    onSuccess: (data) => {
      console.log('Данные автоматически сохранены', data);
    }
  });
  
  // Группируем недели только по месяцам (без учета года)
  const monthGroups = useMemo(() => {
    return weeks.reduce((acc, w) => {
      // Используем только название месяца без года
      const key = format(w.startDate, "LLLL", { locale: ru }); // «сентябрь»
      (acc[key] ||= []).push(w);
      return acc;
    }, {} as Record<string, WeekCell[]>);
  }, [weeks]);
  
  // Состояние для модального окна и выбранной ячейки
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  
  // Состояние для множественного выделения ячеек
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  
  // Состояние для отслеживания последней выбранной ячейки (для Shift+клик)
  const [lastSelectedCell, setLastSelectedCell] = useState<string | null>(null);
  
  // Функция для генерации ключа ячейки
  const getCellKey = (courseId: number, weekNumber: number): string => {
    return `course${courseId}_week${weekNumber}`;
  };
  
  // Функция парсинга ключа ячейки в компоненты (для Shift+клик)
  const parseCellKey = (key: string): { courseId: number, weekNumber: number } | null => {
    const match = key.match(/course([0-9]+)_week([0-9]+)/);
    if (!match) return null;
    
    return {
      courseId: parseInt(match[1]),
      weekNumber: parseInt(match[2])
    };
  };
  
  // Очистка выделения
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setLastSelectedCell(null);
  }, []);
  
  // Обработчик нажатия клавиш для выделения (Del, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // При нажатии Delete или Backspace снимаем выделение
        clearSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);
  
  // Обработчик изменения значения ячейки или группы ячеек
  const handleCellChange = (activity: ActivityType, applyToSelection: boolean = false) => {
    const newData = { ...tableData };
    
    // Если применяем к выделению и есть выделенные ячейки
    if (applyToSelection && selectedCells.size > 0) {
      // Применяем значение ко всем выделенным ячейкам
      selectedCells.forEach(cellKey => {
        newData[cellKey] = activity;
      });
      
      // Очищаем выделение после изменения группы ячеек
      clearSelection();
    } 
    // Если просто меняем одну ячейку из диалога
    else if (selectedWeek) {
      const cellKey = getCellKey(selectedWeek.courseId, selectedWeek.weekNumber);
      newData[cellKey] = activity;
    }
    
    setTableData(newData);
    
    // Вызов колбэка при изменении данных
    if (onChange) {
      onChange(newData);
    }
  };
  
  // Обработчик клика по ячейке с поддержкой множественного выделения
  const handleCellClick = (info: CellInfo, event: React.MouseEvent) => {
    const cellKey = getCellKey(info.courseId, info.weekNumber);
    
    // Если это двойной клик - открываем диалог для редактирования одной недели
    if (event.detail === 2) {
      setSelectedCellKey(cellKey);
      
      // Создаем объект с информацией о выбранной неделе
      setSelectedWeek({
        courseId: info.courseId,
        weekNumber: info.weekNumber,
        startDate: info.startDate,
        endDate: info.endDate,
        monthName: info.monthName
      });
      
      setDialogOpen(true);
      return;
    }
    
    // Если Shift+клик и у нас есть последний выбранный элемент,
    // добавляем все элементы в диапазоне
    if (event.shiftKey && lastSelectedCell) {
      const lastCell = parseCellKey(lastSelectedCell);
      const currentCell = { courseId: info.courseId, weekNumber: info.weekNumber };
      
      if (lastCell && lastCell.courseId === currentCell.courseId) {
        // Определяем диапазон недель для выделения
        const minWeek = Math.min(lastCell.weekNumber, currentCell.weekNumber);
        const maxWeek = Math.max(lastCell.weekNumber, currentCell.weekNumber);
        
        const newSelectedCells = new Set(selectedCells);
        
        // Добавляем все ячейки в диапазоне
        for (let week = minWeek; week <= maxWeek; week++) {
          const key = getCellKey(currentCell.courseId, week);
          newSelectedCells.add(key);
        }
        
        setSelectedCells(newSelectedCells);
      }
    } 
    // Одиночный клик - добавляем/удаляем ячейку из выделения
    else {
      const newSelectedCells = new Set(selectedCells);
      
      if (newSelectedCells.has(cellKey)) {
        newSelectedCells.delete(cellKey);
      } else {
        newSelectedCells.add(cellKey);
      }
      
      setSelectedCells(newSelectedCells);
      setLastSelectedCell(cellKey);
    }
  };
  
  // Обработчик изменения активности в диалоге (для одной ячейки)
  const handleActivityChange = (activity: ActivityType) => {
    // Просто делегируем в основной обработчик, указывая что это НЕ множественное изменение
    handleCellChange(activity, false);
  };
  
  // Обновляем tooltip цвета и стили
  useEffect(() => {
    const tooltipStyle = `
      .academic-tooltip {
        background-color: rgb(15 23 42) !important; /* bg-slate-900 */
        color: white !important;
        border-radius: 0.375rem !important; /* rounded-md */
        padding: 0.75rem !important; /* px-3 py-2 */
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important; /* shadow-lg */
        z-index: 50 !important;
        transition-delay: 1000ms !important;
        opacity: 1 !important;
      }
      
      @media (prefers-color-scheme: dark) {
        .academic-tooltip {
          background-color: white !important; /* dark:bg-white */
          color: rgb(15 23 42) !important; /* dark:text-slate-900 */
        }
      }
      
      /* Tooltip arrow */
      .academic-tooltip.react-tooltip .react-tooltip-arrow {
        color: rgb(15 23 42) !important;
      }
      
      @media (prefers-color-scheme: dark) {
        .academic-tooltip.react-tooltip .react-tooltip-arrow {
          color: white !important;
        }
      }
    `;
    
    // Добавляем стили в head
    const styleElement = document.createElement('style');
    styleElement.innerHTML = tooltipStyle;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Функция для получения стиля ячейки в зависимости от активности
  const getActivityStyle = (activity: ActivityType): { bg: string, text: string } => {
    const defaultStyle = { bg: "bg-slate-50 dark:bg-slate-900", text: "text-slate-900 dark:text-slate-100 font-bold" };
    
    if (!activity) {
      return defaultStyle;
    }
    
    // Проверяем, является ли активность строкой из нескольких символов
    if (activity.length > 1) {
      // Если это строка активностей, берем первую букву как представителя всей недели
      const primaryActivity = activity[0] as ActivityType;
      
      // Проверяем, есть ли такой ключ в ACTIVITY_TYPES
      if (primaryActivity && primaryActivity in ACTIVITY_TYPES) {
        // Используем цвета из WeekActivityDialog
        if (primaryActivity in ACTIVITY_COLORS) {
          const colorObj = ACTIVITY_COLORS[primaryActivity as keyof typeof ACTIVITY_COLORS];
          return { bg: colorObj.bg, text: "text-slate-900 dark:text-slate-100 font-bold" };
        }
      }
      return { bg: "bg-slate-200 dark:bg-slate-600", text: "text-slate-900 dark:text-slate-100 font-bold" };
    }
    
    // Для одиночной буквы
    if (activity in ACTIVITY_TYPES) {
      // Используем цвета из WeekActivityDialog
      if (activity in ACTIVITY_COLORS) {
        const colorObj = ACTIVITY_COLORS[activity as keyof typeof ACTIVITY_COLORS];
        return { bg: colorObj.bg, text: "text-slate-900 dark:text-slate-100 font-bold" };
      }
    }
    
    // Для нестандартного символа активности
    return { bg: "bg-slate-200 dark:bg-slate-600", text: "text-slate-900 dark:text-slate-100 font-bold" };
  };
  
  // Проверка на последний день месяца (для границы месяцев)
  const isLastDayOfMonth = (date: Date): boolean => {
    // Создаем новую дату, прибавляем 1 день и проверяем, изменился ли месяц
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay.getMonth() !== date.getMonth();
  };
  
  // Создание заголовков месяцев и недель
  const renderHeaders = () => {
    const headers = [];
    
    // Создаем объединенный массив всех недель из первого курса для заголовков
    // Используем недели первого учебного года в качестве шаблона
    const firstCourseWeeks = buildAcademicWeeks(weeks[0].startDate);
    
    // Группируем недели только по месяцам
    const monthGroups = useMemo(() => {
      return firstCourseWeeks.reduce((acc, w) => {
        // Используем только название месяца без года
        const key = format(w.startDate, "LLLL", { locale: ru }); // «сентябрь»
        (acc[key] ||= []).push(w);
        return acc;
      }, {} as Record<string, WeekCell[]>);
    }, [firstCourseWeeks]);
    
    // Заголовок "Месяцы"
    headers.push(
      <tr key="month-row" className="whitespace-nowrap">
        <th 
          className="sticky left-0 z-30 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 text-center font-semibold border-r-2 border-r-slate-600 shadow-md"
          rowSpan={1}
        >
          Месяцы
        </th>
        {Object.entries(monthGroups).map(([key, list], i) => {
          return (
            <th 
              key={key} 
              colSpan={list.length}
              className={`px-2 py-1 text-center font-medium ${i % 2 === 0 ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              {key}
            </th>
          );
        })}
      </tr>
    );
    
    // Заголовок "Недели"
    headers.push(
      <tr key="week-row" className="whitespace-nowrap">
        <th 
          className="sticky left-0 z-30 bg-slate-700 dark:bg-slate-800 text-white px-4 py-2 text-center font-semibold border-r-2 border-r-slate-600 shadow-md"
        >
          Недели
        </th>
        {firstCourseWeeks.map((w, idx) => {
          // Определяем месяц для чередования фона
          const monthIndex = Object.keys(monthGroups).findIndex(
            month => month === format(w.startDate, "LLLL", { locale: ru })
          );
          const isEvenMonth = monthIndex % 2 === 0;
          
          // Проверяем, является ли эта неделя концом месяца
          const isMonthEnd = isLastDayOfMonth(w.endDate);
          
          // Проверяем, пересекает ли неделя границу месяцев
          const isCrossingMonths = w.startDate.getMonth() !== w.endDate.getMonth();
          
          // Если неделя пересекает месяцы, расчитываем количество дней в текущем и следующем месяце
          let bgClass = '';
          bgClass = isEvenMonth 
            ? 'bg-slate-100 dark:bg-slate-800' 
            : 'bg-slate-200 dark:bg-slate-700';
            
          // Стиль для последнего столбца месяца (градиент)
          let style = {};
          
          // Если это последний столбец месяца и существует следующий месяц, добавляем градиент
          if (isMonthEnd && idx < firstCourseWeeks.length - 1) {
            const nextMonthIdx = monthIndex + 1;
            const isNextMonthEven = nextMonthIdx % 2 === 0;
            const monthColor = isEvenMonth ? 'var(--month-color, #f1f5f9)' : 'var(--month-color, #e2e8f0)';
            const nextMonthColor = isNextMonthEven ? 'var(--next-month-color, #f1f5f9)' : 'var(--next-month-color, #e2e8f0)';
            
            style = {
              background: `linear-gradient(to right, ${monthColor} 0%, ${monthColor} 90%, ${nextMonthColor} 100%)`
            };
            
            // Для темной темы
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
              const darkMonthColor = isEvenMonth ? 'var(--month-color, #1e293b)' : 'var(--month-color, #334155)';
              const darkNextMonthColor = isNextMonthEven ? 'var(--next-month-color, #1e293b)' : 'var(--next-month-color, #334155)';
              
              style = {
                background: `linear-gradient(to right, ${darkMonthColor} 0%, ${darkMonthColor} 90%, ${darkNextMonthColor} 100%)`
              };
            }
          }
          
          return (
            <th 
              key={`week_${w.index}`}
              className={`px-1 py-1 text-xs font-semibold w-8 text-center 
                ${isMonthEnd ? 'border-r border-slate-400/40 dark:border-slate-400/40' : ''}
                ${!isMonthEnd ? bgClass : ''}`}
              style={isMonthEnd ? style : {}}
            >
              {w.index}
            </th>
          );
        })}
      </tr>
    );
    
    return headers;
  };
  
  // Создание строк для курсов с учетом дат из startDates
  const renderCourseRows = () => {
    // Создаем данные курсов для каждого года обучения
    const courses: Course[] = [];
    
    // Для каждого курса генерируем отдельный набор недель
    for (let courseIdx = 0; courseIdx < NUMBER_OF_COURSES; courseIdx++) {
      const courseId = courseIdx + 1;
      const courseIdStr = courseId.toString();
      
      // Используем дату из startDates или дефолтную дату
      const courseStartDate = startDates[courseIdStr] || 
        (courseIdx === 0 ? weeks[0].startDate : getFirstWorkdayOfSeptember(weeks[0].startDate.getFullYear() + courseIdx));
      
      // Генерируем массив недель для этого курса, начиная с его даты начала
      const courseWeeks = buildAcademicWeeks(courseStartDate);
      
      courses.push({
        id: courseId,
        name: `Курс ${courseId}`,
        startDate: courseStartDate,
        weeks: courseWeeks, // Сохраняем недели, специфичные для этого курса
      });
    }
    
    // Рендерим компонент CourseRow для каждого курса
    return courses.map(course => (
      <CourseRow
        key={`course-row-${course.id}`}
        course={course}
        weeks={weeks} // Передаем базовые недели для заголовков (используемые для отображения)
        courseWeeks={course.weeks} // Передаем недели специфичные для этого курса (для расчета смещения)
        tableData={tableData}
        selectedCellKey={selectedCellKey}
        selectedCells={selectedCells}
        onCellClick={handleCellClick}
        isLastDayOfMonth={isLastDayOfMonth}
        startDate={startDates && startDates[course.id] ? startDates[course.id] : course.startDate}
      />
    ));
  };
  
  return (
    <div className="w-full">
      <div className="rounded-md overflow-hidden border shadow-sm dark:border-slate-700">
        <div className="overflow-auto max-h-[500px] custom-scrollbar">
          <div className="min-w-max">
            <table className="w-full border-collapse">
              <thead>
                {renderHeaders()}
              </thead>
              <tbody className="bg-slate-50 dark:bg-slate-900">
                {renderCourseRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Обозначения:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
              const { bg, text } = getActivityStyle(code as ActivityType);
              return (
                <div key={code} className="text-xs bg-muted px-2 py-1 rounded-md flex items-center">
                  <span className={`mr-1 ${bg} ${text} w-6 h-6 flex items-center justify-center rounded font-semibold`}>
                    {code}
                  </span> 
                  — {description}
                </div>
              );
            })}
          </div>
          
          <div className="text-xs text-slate-500 mt-1">
            * Курс 2, 3, 4 начинаются с первого рабочего дня сентября (+1, +2, +3 года от начала обучения)
          </div>
          
          <div className="text-xs text-slate-500 mt-1">
            * Одинарный клик — выделить ячейку, Shift+клик — выделить диапазон, двойной клик — редактировать
          </div>
        </div>
        
        <div>
          <SaveButton 
            onClick={forceSave}
            isSaving={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          />
        </div>
      </div>
      
      {/* Floating Action Bar для множественного выделения */}
      {selectedCells.size > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 flex gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <span className="mr-2 text-sm">Выбрано {selectedCells.size} недель:</span>
          
          {/* Кнопки активностей */}
          {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
            const { bg } = getActivityStyle(code as ActivityType);
            return (
              <button
                key={code}
                className={`${bg} w-8 h-8 rounded font-semibold hover:ring-2 hover:ring-slate-400/50 dark:hover:ring-white/50 transition-all`}
                onClick={() => handleCellChange(code as ActivityType, true)}
                title={description}
              >
                {code}
              </button>
            );
          })}
          
          {/* Кнопка очистки */}
          <button
            className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 px-2 rounded text-sm hover:ring-2 hover:ring-slate-400/50 dark:hover:ring-white/50 transition-all"
            onClick={() => handleCellChange("", true)}
          >
            Очистить
          </button>
          
          {/* Кнопка закрытия (снимает выделение) */}
          <button
            className="ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1 transition-colors"
            onClick={clearSelection}
            title="Снять выделение"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      <WeekActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        weekInfo={selectedWeek}
        currentActivity={selectedWeek ? tableData[getCellKey(selectedWeek.courseId, selectedWeek.weekNumber)] || "" : ""}
        onActivityChange={handleActivityChange}
      />
      
      {/* Тултип для календаря */}
      <Tooltip 
        id="calendar-tooltip" 
        className="academic-tooltip" 
        place="top"
        clickable={true}
        delayHide={0}
        delayShow={1000}
      />
    </div>
  );
}