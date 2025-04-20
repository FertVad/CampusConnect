import React, { useState, useMemo } from "react";
import { WeekActivityDialog, WeekInfo, ActivityType, ACTIVITY_TYPES, ACTIVITY_COLORS } from "./WeekActivityDialog";
import { buildAcademicWeeks, WeekCell } from "@/utils/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";

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
}

interface AcademicCalendarTableProps {
  yearsOfStudy: number;
  onChange?: (data: CalendarData) => void;
  initialData?: CalendarData;
}

export function AcademicCalendarTable({ 
  yearsOfStudy = 4, 
  onChange,
  initialData = {} 
}: AcademicCalendarTableProps) {
  // Состояние для хранения данных таблицы
  const [tableData, setTableData] = useState<CalendarData>(initialData);
  
  // Генерируем недели учебного года
  const weeks: WeekCell[] = useMemo(() => buildAcademicWeeks(2025), []);
  
  // Группируем недели по месяцам
  const monthGroups = useMemo(() => {
    return weeks.reduce((acc, w) => {
      (acc[w.month] ||= []).push(w);
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
    // Находим данные о неделе по её номеру
    const weekData = weeks.find(w => w.index === info.weekNumber);
    
    if (!weekData) {
      console.error(`Неделя с номером ${info.weekNumber} не найдена`);
      return;
    }
    
    const cellKey = getCellKey(info.courseId, info.weekNumber);
    setSelectedCellKey(cellKey);
    
    setSelectedWeek({
      courseId: info.courseId,
      weekNumber: info.weekNumber,
      startDate: weekData.startDate,
      endDate: weekData.endDate,
      monthName: weekData.month
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
    const defaultStyle = { bg: "bg-white dark:bg-slate-900", text: "text-gray-800 dark:text-gray-300" };
    
    if (!activity) {
      return defaultStyle;
    }
    
    // Проверяем, является ли активность строкой из нескольких символов
    if (activity.length > 1) {
      // Если это строка активностей, берем первую букву как представителя всей недели
      // В будущем, здесь можно реализовать более сложную логику отображения
      const primaryActivity = activity[0] as ActivityType;
      
      if (primaryActivity && primaryActivity in ACTIVITY_COLORS) {
        return {
          bg: ACTIVITY_COLORS[primaryActivity as Exclude<ActivityType, "">].bg,
          text: ACTIVITY_COLORS[primaryActivity as Exclude<ActivityType, "">].text
        };
      }
      return { bg: "bg-slate-200 dark:bg-slate-600", text: "text-slate-800 dark:text-white" };
    }
    
    // Для одиночной буквы
    if (activity in ACTIVITY_COLORS) {
      return {
        bg: ACTIVITY_COLORS[activity as Exclude<ActivityType, "">].bg,
        text: ACTIVITY_COLORS[activity as Exclude<ActivityType, "">].text
      };
    }
    
    // Для нестандартного символа активности
    return { bg: "bg-slate-200 dark:bg-slate-600", text: "text-slate-800 dark:text-white" };
  };
  
  // Создание заголовков месяцев и недель
  const renderHeaders = () => {
    const headers = [];
    
    // Заголовок "Месяцы"
    headers.push(
      <tr key="month-row" className="bg-slate-100 whitespace-nowrap dark:bg-slate-800">
        <th 
          className="sticky left-0 z-30 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 text-center font-semibold border-r-2 border-r-slate-600 shadow-md"
          rowSpan={1}
        >
          Месяцы
        </th>
        {Object.entries(monthGroups).map(([month, list], i) => (
          <th 
            key={month} 
            colSpan={list.length}
            className={`px-2 py-1 text-center font-medium border-x ${i % 2 === 0 ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {month}
          </th>
        ))}
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
        {weeks.map((w, idx) => (
          <th 
            key={`week_${w.index}`}
            className={`px-1 py-1 text-xs font-semibold border-x w-8 text-center 
              ${(idx % 8 < 4) ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            {w.index}
          </th>
        ))}
      </tr>
    );
    
    return headers;
  };
  
  // Создание строк для курсов
  const renderCourseRows = () => {
    return Array.from({ length: NUMBER_OF_COURSES }).map((_, courseIndex) => {
      const courseId = courseIndex + 1;
      
      return (
        <tr key={`course${courseId}`} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/70">
          <td className="sticky left-0 z-20 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 font-medium border-r-2 border-r-slate-600 text-center shadow-md">
            Курс {courseId}
          </td>
          {weeks.map((w, idx) => {
            const cellKey = getCellKey(courseId, w.index);
            const activity = tableData[cellKey] || "";
            const { bg, text } = getActivityStyle(activity);
            const isSelected = cellKey === selectedCellKey;
            const isEvenGroup = idx % 8 < 4;
            const baseClassName = isEvenGroup ? 'bg-slate-50/50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-950/40';
            
            return (
              <td 
                key={cellKey}
                title={`${format(w.startDate, 'd MMM', {locale: ru})} – ${format(w.endDate, 'd MMM', {locale: ru})}`}
                className={`p-0 border-0 text-center cursor-pointer transition-colors
                  ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500 shadow-lg' : ''}`}
                onClick={() => handleCellClick({
                  courseId,
                  weekNumber: w.index,
                  monthName: w.month,
                  value: activity
                })}
              >
                <div className={`h-8 w-full flex items-center justify-center ${activity ? bg : baseClassName} transition-all hover:brightness-95 dark:hover:brightness-125`}>
                  {/* Отображаем буквенное обозначение активности */}
                  <span className={`font-bold text-sm ${activity ? text : ''}`}>
                    {activity ? (activity.length > 1 ? activity[0] + "+" : activity) : ""}
                  </span>
                  {activity && activity.length > 1 && (
                    <span className="ml-0.5 text-[10px] text-slate-600 dark:text-slate-300 opacity-75">
                      {activity.length}
                    </span>
                  )}
                </div>
              </td>
            );
          })}
        </tr>
      );
    });
  };
  
  return (
    <div className="w-full">
      <div className="rounded-md overflow-hidden border shadow-sm dark:border-slate-700">
        <div className="overflow-auto max-h-[500px]">
          <div className="min-w-max">
            <table className="w-full border-collapse">
              <thead>
                {renderHeaders()}
              </thead>
              <tbody className="bg-white dark:bg-slate-900">
                {renderCourseRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Обозначения:</h4>
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
      </div>
      
      <WeekActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        weekInfo={selectedWeek}
        currentActivity={selectedWeek ? tableData[getCellKey(selectedWeek.courseId, selectedWeek.weekNumber)] || "" : ""}
        onActivityChange={handleActivityChange}
      />
    </div>
  );
}