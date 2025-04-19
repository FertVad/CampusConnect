import React, { useState } from "react";
import { WeekActivityDialog, WeekInfo, ActivityType, ACTIVITY_TYPES } from "./WeekActivityDialog";

// Перечисление месяцев учебного года (с сентября по август)
const MONTHS = [
  "Сентябрь", "Октябрь", "Ноябрь", "Декабрь", 
  "Январь", "Февраль", "Март", "Апрель", 
  "Май", "Июнь", "Июль", "Август"
];

// Общее количество недель в учебном году (с сентября по август)
const WEEKS_IN_YEAR = 52;

// Количество курсов
const NUMBER_OF_COURSES = 4;

// Количество недель в каждом месяце
const WEEKS_PER_MONTH: { [key: string]: number } = {
  "Сентябрь": 4,
  "Октябрь": 4,
  "Ноябрь": 4,
  "Декабрь": 4,
  "Январь": 4,
  "Февраль": 4,
  "Март": 5,
  "Апрель": 4,
  "Май": 4,
  "Июнь": 4,
  "Июль": 4,
  "Август": 5,
};

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
    // Создаем примерные даты начала и окончания недели
    // В реальном приложении эти данные нужно рассчитывать точнее
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1 + (info.weekNumber - 1) * 7);
    const endDate = new Date(currentYear, 0, 7 + (info.weekNumber - 1) * 7);
    
    const cellKey = getCellKey(info.courseId, info.weekNumber);
    setSelectedCellKey(cellKey);
    
    setSelectedWeek({
      courseId: info.courseId,
      weekNumber: info.weekNumber,
      startDate,
      endDate,
      monthName: info.monthName
    });
    
    setDialogOpen(true);
  };
  
  // Обработчик изменения активности в диалоге
  const handleActivityChange = (activity: ActivityType) => {
    if (!selectedWeek) return;
    
    const cellKey = getCellKey(selectedWeek.courseId, selectedWeek.weekNumber);
    handleCellChange(cellKey, activity);
  };
  
  // Функция для получения стиля ячейки в зависимости от активности
  const getActivityStyle = (activity: ActivityType): { bg: string, text: string } => {
    switch (activity) {
      case "У": return { bg: "bg-blue-200", text: "text-blue-800" };
      case "К": return { bg: "bg-gray-200", text: "text-gray-800" };
      case "П": return { bg: "bg-yellow-200", text: "text-yellow-800" };
      case "Э": return { bg: "bg-red-200", text: "text-red-800" };
      case "Д": return { bg: "bg-purple-200", text: "text-purple-800" };
      default: return { bg: "bg-white", text: "text-gray-800" };
    }
  };
  
  // Создание заголовков месяцев и недель
  const renderHeaders = () => {
    const headers = [];
    
    // Заголовок "Месяцы"
    headers.push(
      <tr key="month-row" className="bg-slate-100 whitespace-nowrap dark:bg-slate-800">
        <th 
          className="sticky left-0 z-30 bg-blue-900 text-white px-4 py-2 text-center font-semibold border-r-2 border-r-slate-600"
          rowSpan={1}
        >
          Месяцы
        </th>
        {MONTHS.map((month, monthIndex) => {
          // Вычисляем количество недель в этом месяце
          const weeksInMonth = WEEKS_PER_MONTH[month];
          const isEvenMonth = monthIndex % 2 === 0;
          
          return (
            <th 
              key={`${month}`} 
              colSpan={weeksInMonth}
              className={`px-2 py-1 text-center font-medium border-x ${isEvenMonth ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              {month}
            </th>
          );
        })}
      </tr>
    );
    
    // Заголовок "Недели"
    headers.push(
      <tr key="week-row" className="whitespace-nowrap">
        <th 
          className="sticky left-0 z-30 bg-blue-800 text-white px-4 py-2 text-center font-semibold border-r-2 border-r-slate-600"
        >
          Недели
        </th>
        {MONTHS.flatMap((month, monthIndex) => {
          const weeksInMonth = WEEKS_PER_MONTH[month];
          const weekHeaders = [];
          let weekOffset = 0;
          
          // Вычисляем смещение недель для этого месяца
          for (let i = 0; i < monthIndex; i++) {
            weekOffset += WEEKS_PER_MONTH[MONTHS[i]];
          }
          
          const isEvenMonth = monthIndex % 2 === 0;
          
          for (let i = 0; i < weeksInMonth; i++) {
            const weekNumber = weekOffset + i + 1;
            
            weekHeaders.push(
              <th 
                key={`month_${month}_week${weekNumber}`}
                className={`px-1 py-1 text-xs font-semibold border-x w-8 text-center 
                  ${isEvenMonth ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                {weekNumber}
              </th>
            );
          }
          
          return weekHeaders;
        })}
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
          <td className="sticky left-0 z-20 bg-blue-900 text-white px-4 py-2 font-medium border-r-2 border-r-slate-600 text-center">
            Курс {courseId}
          </td>
          {MONTHS.flatMap((month, monthIndex) => {
            const weeksInMonth = WEEKS_PER_MONTH[month];
            const weekCells = [];
            let weekOffset = 0;
            
            // Вычисляем смещение недель для этого месяца
            for (let i = 0; i < monthIndex; i++) {
              weekOffset += WEEKS_PER_MONTH[MONTHS[i]];
            }
            
            const isEvenMonth = monthIndex % 2 === 0;
            const baseClassName = isEvenMonth ? 'bg-slate-50 dark:bg-slate-900/70' : 'bg-white dark:bg-slate-950/70';
            
            for (let i = 0; i < weeksInMonth; i++) {
              const weekNumber = weekOffset + i + 1;
              const cellKey = getCellKey(courseId, weekNumber);
              const activity = tableData[cellKey] || "";
              const { bg, text } = getActivityStyle(activity);
              const isSelected = cellKey === selectedCellKey;
              
              weekCells.push(
                <td 
                  key={cellKey}
                  className={`px-0 py-0 border text-center ${baseClassName} cursor-pointer transition-colors
                    ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500 shadow-lg' : ''}`}
                  onClick={() => handleCellClick({
                    courseId,
                    weekNumber,
                    monthName: month,
                    value: activity
                  })}
                >
                  <div className={`h-8 w-full flex items-center justify-center font-semibold text-sm ${activity ? bg : ''} ${activity ? text : ''}`}>
                    {activity}
                  </div>
                </td>
              );
            }
            
            return weekCells;
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