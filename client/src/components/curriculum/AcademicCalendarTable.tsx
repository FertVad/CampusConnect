import React, { useState } from "react";
import { Input } from "@/components/ui/input";

// Перечисление месяцев
const MONTHS = [
  "Сентябрь", "Октябрь", "Ноябрь", "Декабрь", 
  "Январь", "Февраль", "Март", "Апрель", 
  "Май", "Июнь", "Июль", "Август"
];

// Константа для количества недель в месяце (для упрощения)
const WEEKS_PER_MONTH = 4;

// Количество курсов
const NUMBER_OF_COURSES = 4;

// Интерфейс для ячейки данных
interface CellData {
  courseId: number;   // Номер курса (1-4)
  year: number;       // Год обучения (1-4)
  month: string;      // Название месяца
  week: number;       // Номер недели в месяце (1-4)
  value: string;      // Значение в ячейке ("У", "К", "П", и т.д.)
}

// Тип для всех данных таблицы
type CalendarData = Record<string, string>;

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
  
  // Функция для генерации ключа ячейки
  const getCellKey = (courseId: number, monthIndex: number, weekIndex: number): string => {
    return `course${courseId}_month${monthIndex}_week${weekIndex}`;
  };
  
  // Обработчик изменения значения ячейки
  const handleCellChange = (key: string, value: string) => {
    const newData = { ...tableData, [key]: value };
    setTableData(newData);
    
    // Вызов колбэка при изменении данных
    if (onChange) {
      onChange(newData);
    }
  };
  
  // Создание заголовков месяцев и недель
  const renderMonthHeaders = () => {
    const headers = [];
    
    // Заголовки месяцев
    headers.push(
      <tr key="month-headers" className="bg-muted/40">
        <th className="sticky left-0 z-20 bg-muted/40 px-4 py-2 font-semibold text-left">Курс</th>
        {Array.from({ length: yearsOfStudy }).flatMap((_, yearIndex) => 
          MONTHS.map((month, monthIndex) => (
            <th 
              key={`year${yearIndex+1}_${month}`} 
              colSpan={WEEKS_PER_MONTH}
              className="px-2 py-1 text-center font-medium border-x"
            >
              {month}
            </th>
          ))
        )}
      </tr>
    );
    
    // Заголовки недель
    headers.push(
      <tr key="week-headers" className="bg-muted/30">
        <th className="sticky left-0 z-20 bg-muted/30 px-4 py-2 font-semibold"></th>
        {Array.from({ length: yearsOfStudy }).flatMap((_, yearIndex) => 
          MONTHS.map((_, monthIndex) => 
            Array.from({ length: WEEKS_PER_MONTH }).map((_, weekIndex) => (
              <th 
                key={`year${yearIndex+1}_month${monthIndex}_week${weekIndex+1}`}
                className="px-0 py-1 text-xs font-normal border-x w-10"
              >
                {weekIndex + 1}
              </th>
            ))
          )
        )}
      </tr>
    );
    
    return headers;
  };
  
  // Создание строк для курсов
  const renderCourseRows = () => {
    return Array.from({ length: NUMBER_OF_COURSES }).map((_, courseIndex) => {
      const courseId = courseIndex + 1;
      
      return (
        <tr key={`course${courseId}`} className="border-t hover:bg-muted/20">
          <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium border-r">
            Курс {courseId}
          </td>
          {Array.from({ length: yearsOfStudy }).flatMap((_, yearIndex) => 
            MONTHS.map((_, monthIndex) => 
              Array.from({ length: WEEKS_PER_MONTH }).map((_, weekIndex) => {
                const cellKey = getCellKey(courseId, monthIndex + yearIndex * MONTHS.length, weekIndex);
                
                return (
                  <td 
                    key={cellKey}
                    className="px-0 py-0 border text-center"
                  >
                    <Input
                      className="h-8 w-10 text-center border-0 focus:ring-1 focus:ring-primary"
                      value={tableData[cellKey] || ""}
                      onChange={(e) => handleCellChange(cellKey, e.target.value)}
                      maxLength={1}
                    />
                  </td>
                );
              })
            )
          )}
        </tr>
      );
    });
  };
  
  return (
    <div className="w-full">
      <div className="w-full border rounded-md overflow-auto">
        <div className="min-w-max">
          <table className="w-full border-collapse">
            <thead>
              {renderMonthHeaders()}
            </thead>
            <tbody>
              {renderCourseRows()}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="text-xs bg-muted px-2 py-1 rounded-md flex items-center">
          <span className="font-semibold mr-1">У</span> — Учебный процесс
        </div>
        <div className="text-xs bg-muted px-2 py-1 rounded-md flex items-center">
          <span className="font-semibold mr-1">К</span> — Каникулы
        </div>
        <div className="text-xs bg-muted px-2 py-1 rounded-md flex items-center">
          <span className="font-semibold mr-1">П</span> — Практика
        </div>
        <div className="text-xs bg-muted px-2 py-1 rounded-md flex items-center">
          <span className="font-semibold mr-1">Э</span> — Экзаменационная сессия
        </div>
        <div className="text-xs bg-muted px-2 py-1 rounded-md flex items-center">
          <span className="font-semibold mr-1">Д</span> — Дипломное проектирование
        </div>
      </div>
    </div>
  );
}