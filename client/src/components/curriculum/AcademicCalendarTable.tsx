import React, { useState, useMemo } from "react";
import { WeekActivityDialog, WeekInfo, ActivityType, ACTIVITY_TYPES, ACTIVITY_COLORS, weekGradient } from "./WeekActivityDialog";
import { WeekCell } from "@/utils/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

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
  weeks: WeekCell[];            // Массив недель для отображения
  yearsOfStudy: number;
  onChange?: (data: CalendarData) => void;
  initialData?: CalendarData;
}

export function AcademicCalendarTable({ 
  weeks,
  yearsOfStudy = 4, 
  onChange,
  initialData = {} 
}: AcademicCalendarTableProps) {
  // Состояние для хранения данных таблицы
  const [tableData, setTableData] = useState<CalendarData>(initialData);
  
  // Группируем недели по месяцам и годам
  const monthGroups = useMemo(() => {
    return weeks.reduce((acc, w) => {
      const key = format(w.startDate, "LLLL yyyy", { locale: ru }); // «сентябрь 2023»
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
        {Object.entries(monthGroups).map(([key, list], i) => {
          const [month, yr] = key.split(" ");
          return (
            <th 
              key={key} 
              colSpan={list.length}
              className={`px-2 py-1 text-center font-medium border-x ${i % 2 === 0 ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              {month}
              <span className="block text-[10px] opacity-70">{yr}</span>
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
  
  // Создание строк для курсов с учетом сдвига по годам
  const renderCourseRows = () => {
    // Функция для расчета смещения недель в зависимости от курса (примерно 52 недели в году)
    const courseOffsetWeeks = (courseId: number) => (courseId - 1) * 52;
    
    return Array.from({ length: NUMBER_OF_COURSES }).map((_, courseIndex) => {
      const courseId = courseIndex + 1;
      const courseOffset = courseOffsetWeeks(courseId);
      
      return (
        <tr key={`course${courseId}`} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/70">
          <td className="sticky left-0 z-20 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 font-medium border-r-2 border-r-slate-600 text-center shadow-md">
            Курс {courseId}
          </td>
          {weeks.map((w, idx) => {
            // Если индекс меньше смещения для данного курса - отображаем затененную ячейку
            if (idx < courseOffset) {
              return (
                <td 
                  key={`inactive_${courseId}_${idx}`} 
                  className="p-0 h-8 bg-slate-900/10 dark:bg-slate-900/30 border-0"
                />
              );
            }
            
            // Номер недели в рамках текущего курса
            const adjustedWeekNumber = idx - courseOffset + 1;
            const cellKey = getCellKey(courseId, adjustedWeekNumber);
            const activity = tableData[cellKey] || "";
            const { bg, text } = getActivityStyle(activity);
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <td 
                      key={`active_${cellKey}`}
                      className={`p-0 border-0 text-center cursor-pointer transition-colors
                        ${isMonthBoundary ? 'border-r-2 border-slate-300 dark:border-slate-600' : ''}
                        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                      onClick={() => handleCellClick({
                        courseId,
                        weekNumber: adjustedWeekNumber,
                        monthName: w.month,
                        value: activity
                      })}
                    >
                      {/* Используем градиент вместо цветовых классов */}
                      <div 
                        className={`h-8 w-full flex items-center justify-center transition-all hover:brightness-95 ${!activity ? (crossMonth ? gradientBg : chessBg) : ''}`}
                        style={activity ? { background: weekGradient(activity) } : {}}
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
                      </div>
                    </td>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="p-2 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold">
                        Кал. неделя {w.index} / Уч. неделя {adjustedWeekNumber}
                      </div>
                      <div>
                        {format(w.startDate, 'd MMM', {locale: ru})} – {format(w.endDate, 'd MMM', {locale: ru})}
                      </div>
                      {activity && (
                        <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <div className="font-semibold mb-1">Активности по дням:</div>
                          <div className="grid grid-cols-7 gap-1">
                            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, i) => {
                              const dayActivity = activity.length > i ? activity[i] : (activity.length === 1 ? activity : "");
                              const colorStyle = dayActivity && dayActivity in ACTIVITY_COLORS
                                ? ACTIVITY_COLORS[dayActivity as Exclude<ActivityType, "">]
                                : { bg: "bg-slate-100", text: "text-slate-700" };
                              
                              return (
                                <div 
                                  key={day} 
                                  className={`text-center p-1 rounded ${colorStyle.bg} ${colorStyle.text}`}
                                >
                                  <div className="text-[10px] opacity-70">{day}</div>
                                  <div className="font-bold">{dayActivity || "—"}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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