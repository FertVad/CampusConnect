import React, { useState, useMemo } from "react";
import { WeekActivityDialog, WeekInfo, ActivityType, ACTIVITY_TYPES, ACTIVITY_COLORS } from "./WeekActivityDialog";
import { Tooltip } from 'react-tooltip';
import { WeekCell, getFirstWorkdayOfSeptember, buildAcademicWeeks } from "@/utils/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SaveButton } from "@/components/ui/save-button";
import { CourseRow } from "./CourseRow";

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
  
  // Функция для генерации ключа ячейки
  const getCellKey = (courseId: number, weekNumber: number): string => {
    return `course${courseId}_week${weekNumber}`;
  };
  
  // Обработчик изменения значения ячейки
  const handleCellChange = (key: string, value: ActivityType) => {
    const newData = { ...tableData, [key]: value };
    setTableData(newData);
    
    // Вызов колбэка при изменении данных
    if (onChange) {
      onChange(newData);
    }
  };
  
  // Обработчик клика по ячейке
  const handleCellClick = (info: CellInfo) => {
    // В info теперь приходит вся необходимая информация о неделе,
    // так как каждый курс имеет свой набор недель
    const cellKey = getCellKey(info.courseId, info.weekNumber);
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
  };
  
  // Обработчик изменения активности в диалоге
  const handleActivityChange = (activity: ActivityType) => {
    if (!selectedWeek) return;
    
    // Создаем ключ для ячейки (например: "course1_week5")
    const cellKey = getCellKey(selectedWeek.courseId, selectedWeek.weekNumber);
    
    console.log("Saving activity for cell:", cellKey, "Activity:", activity);
    
    // Обновляем данные в таблице
    const newTableData = { ...tableData };
    newTableData[cellKey] = activity;
    setTableData(newTableData);
    
    // Сохраняем через родительскую функцию
    if (onChange) {
      onChange(newTableData);
    }
    
    // Обновляем визуальное выделение выбранной ячейки
    setSelectedCellKey(cellKey);
  };
  
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
        onCellClick={handleCellClick}
        isLastDayOfMonth={isLastDayOfMonth}
        startDate={course.startDate}
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
          
          {/* TODO drag-select / Ctrl-click для заливки нескольких недель */}
          <div className="text-xs text-slate-500 mt-2">
            * В будущей версии будет добавлено выделение нескольких недель для массового изменения
          </div>
          
          <div className="text-xs text-slate-500 mt-1">
            * Курс 2, 3, 4 начинаются с первого рабочего дня сентября (+1, +2, +3 года от начала обучения)
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
        style={{ 
          backgroundColor: 'white', 
          color: '#0f172a',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
          borderRadius: '0.375rem',
          padding: '0.5rem 0.75rem',
          zIndex: 9999
        }}
      />
    </div>
  );
}