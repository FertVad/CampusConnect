import React, { useMemo } from "react";
import { ACTIVITY_TYPES } from "./ActivityTypes";
import { SummaryRow } from "@/utils/buildSummary";

export const SummaryTable: React.FC<{ summary: SummaryRow[]; courses: number }> = ({ summary = [], courses }) => {
  // Проверяем, чтобы summary всегда был массивом
  const data = Array.isArray(summary) ? summary : [];
  
  // Рассчитываем количество недель для каждого семестра на каждом курсе
  const weeksPerSemester = useMemo(() => {
    const result: { 
      byCourse: { sem1: number; sem2: number; total: number }[]; 
      total: number 
    } = {
      byCourse: [],
      total: 0
    };
    
    // Инициализируем массив с нулями для каждого курса
    for (let i = 0; i < courses; i++) {
      result.byCourse.push({ sem1: 0, sem2: 0, total: 0 });
    }
    
    // Считаем недели по каждому типу активности
    if (data.length > 0) {
      data.forEach(row => {
        Object.entries(row.perCourse).forEach(([courseIndex, values]) => {
          const idx = parseInt(courseIndex) - 1;
          if (idx >= 0 && idx < courses) {
            result.byCourse[idx].sem1 += values.sem1;
            result.byCourse[idx].sem2 += values.sem2;
            result.byCourse[idx].total += values.total;
          }
        });
        
        // Добавляем к общему итогу
        result.total += row.grandTotal;
      });
    }
    
    return result;
  }, [data, courses]);
  
  return (
    <div className="table-responsive">
      <table className="summary-table w-full border-collapse text-sm">
      <thead>
        <tr>
          <th rowSpan={2} className="sticky left-0 z-10 bg-slate-800 text-white px-3 py-1">Вид</th>
          {Array.from({ length: courses }, (_, i) => (
            <th key={i} colSpan={3}>Курс {i + 1}</th>
          ))}
          <th rowSpan={2}>Всего</th>
        </tr>
        <tr>
          {Array.from({ length: courses }, (_, i) => {
            // Используем явный массив вместо React.Fragment
            return [
              <th key={`sem1-${i}`}>Сем 1</th>,
              <th key={`sem2-${i}`}>Сем 2</th>,
              <th key={`total-${i}`}>Σ</th>
            ];
          }).flat()}
        </tr>
      </thead>
      <tbody>
        {data.length > 0 ? (
          // Выводим строки с данными по каждому типу деятельности
          data.map(r => (
            <tr key={r.activity} className="odd:bg-slate-50 dark:odd:bg-slate-800/40">
              <td className="sticky left-0 bg-slate-700 text-white px-3 py-1 whitespace-nowrap">
                {ACTIVITY_TYPES[r.activity]} ({r.activity})
              </td>
              {Array.from({ length: courses }, (_, i) => {
                const v = r.perCourse[i + 1] ?? { sem1: 0, sem2: 0, total: 0 };
                // Используем явный массив вместо React.Fragment
                return [
                  <td key={`${r.activity}-sem1-${i}`} className="text-center">{v.sem1 || ""}</td>,
                  <td key={`${r.activity}-sem2-${i}`} className="text-center">{v.sem2 || ""}</td>,
                  <td key={`${r.activity}-total-${i}`} className="text-center font-semibold">{v.total || ""}</td>
                ];
              }).flat()}
              <td className="text-center font-bold">{r.grandTotal}</td>
            </tr>
          ))
        ) : (
          // Пустая строка, чтобы таблица всегда отображалась
          <tr>
            <td className="sticky left-0 bg-slate-700 text-white px-3 py-1">-</td>
            {Array.from({ length: courses }, (_, i) => (
              // Используем явный массив вместо React.Fragment
              [
                <td key={`empty-sem1-${i}`} className="text-center">-</td>,
                <td key={`empty-sem2-${i}`} className="text-center">-</td>,
                <td key={`empty-total-${i}`} className="text-center">-</td>
              ]
            )).flat()}
            <td className="text-center">-</td>
          </tr>
        )}
        
        {/* Добавляем итоговую строку с количеством недель */}
        <tr className="bg-slate-100 dark:bg-slate-700/40 border-t-2 border-slate-300">
          <td className="sticky left-0 bg-slate-800 text-white px-3 py-1 whitespace-nowrap font-bold">
            Всего недель
          </td>
          {Array.from({ length: courses }, (_, i) => {
            const weekData = weeksPerSemester.byCourse[i] || { sem1: 0, sem2: 0, total: 0 };
            // Используем явный массив вместо React.Fragment
            return [
              <td key={`weeks-sem1-${i}`} className="text-center font-semibold">{weekData.sem1}</td>,
              <td key={`weeks-sem2-${i}`} className="text-center font-semibold">{weekData.sem2}</td>,
              <td key={`weeks-total-${i}`} className="text-center font-bold">{weekData.total}</td>
            ];
          }).flat()}
          <td className="text-center font-bold bg-slate-200 dark:bg-slate-600/40">{weeksPerSemester.total}</td>
        </tr>
      </tbody>
      </table>
    </div>
  );
};