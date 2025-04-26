import React, { useState, useMemo } from "react";
import { WeekActivityDialog, WeekInfo, ActivityType, ACTIVITY_TYPES } from "./WeekActivityDialog";
import { WeekCell } from "@/utils/calendar";
import { format, addYears } from "date-fns";
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
}

// Интерфейс для курса
interface Course {
  id: number;
  name: string;
  startDate: Date;
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
  
  // Используем хук автосохранения
  const { isSaving, forceSave } = useAutoSave(tableData, {
    url: '/api/curriculum/weeks',
    debounceMs: 1000,
    onSuccess: (data) => {
      console.log('Данные автоматически сохранены', data);
    }
  });
  
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
  
  // Проверка на семестровые даты (31 января и 30 июня)
  const isSemesterBoundary = (date: Date): boolean => {
    // 31 января - конец первого семестра
    if (date.getMonth() === 0 && date.getDate() === 31) return true;
    // 30 июня - конец второго семестра
    if (date.getMonth() === 5 && date.getDate() === 30) return true;
    return false;
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
        {weeks.map((w, idx) => {
          // Проверяем, попадает ли конец семестра в эту неделю
          const isSemesterEnd = (
            isSemesterBoundary(w.startDate) || 
            isSemesterBoundary(w.endDate) ||
            // Проверка, если 31 января или 30 июня находятся внутри недели
            (w.startDate.getMonth() === 0 && w.endDate.getMonth() === 1 && w.endDate.getDate() >= 1) ||
            (w.startDate.getMonth() === 5 && w.endDate.getMonth() === 6 && w.endDate.getDate() >= 1)
          );
          
          return (
            <th 
              key={`week_${w.index}`}
              className={`px-1 py-1 text-xs font-semibold w-8 text-center 
                ${isSemesterEnd ? 'border-r-4 border-indigo-600 dark:border-indigo-400' : 'border-x'}
                ${(idx % 8 < 4) ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              {w.index}
            </th>
          );
        })}
      </tr>
    );
    
    return headers;
  };
  
  // Создание строк для курсов с учетом сдвига по годам
  const renderCourseRows = () => {
    // Создаем данные курсов для каждого года обучения
    const courses: Course[] = Array.from({ length: NUMBER_OF_COURSES }).map((_, idx) => {
      const courseId = idx + 1;
      // Первый курс начинается в дату startDate текущего учебного года
      // Второй курс начинался годом ранее и т.д.
      const courseStartDate = idx === 0 
        ? weeks[0].startDate
        : addYears(weeks[0].startDate, -idx);
        
      return {
        id: courseId,
        name: `Курс ${courseId}`,
        startDate: courseStartDate
      };
    });
    
    // Рендерим компонент CourseRow для каждого курса
    return courses.map(course => (
      <CourseRow
        key={`course-row-${course.id}`}
        course={course}
        weeks={weeks}
        tableData={tableData}
        selectedCellKey={selectedCellKey}
        onCellClick={handleCellClick}
        isSemesterBoundary={isSemesterBoundary}
      />
    ));
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
    </div>
  );
}