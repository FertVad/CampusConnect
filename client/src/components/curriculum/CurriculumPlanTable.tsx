import React, { useState, useEffect, useMemo } from 'react';
import sampleData from '@/data/sampleCurrPlan.json';

interface Discipline {
  id: number;
  name: string;
}

interface CurriculumPlanData {
  disciplines: Discipline[];
}

interface Props {
  courses: number;
  extraMonths: number;
}

export function CurriculumPlanTable({ courses, extraMonths }: Props) {
  const [data, setData] = useState<CurriculumPlanData>(sampleData);
  const [hours, setHours] = useState<Record<string, number>>({});

  // Рассчитываем количество семестров: для каждого курса 2 семестра + 1 дополнительный, если есть extra месяцы
  const semesters = useMemo(() => {
    const base = courses * 2;
    return Array.from(
      { length: base + (extraMonths > 0 ? 1 : 0) },
      (_, i) => i + 1
    );
  }, [courses, extraMonths]);

  // Обработчик изменения часов в ячейке
  const handleHoursChange = (disciplineId: number, semester: number, value: number) => {
    const key = `${disciplineId}_${semester}`;
    setHours(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Обработчик потери фокуса для пустого поля
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, disciplineId: number, semester: number) => {
    if (e.target.value === '') {
      handleHoursChange(disciplineId, semester, 0);
    }
  };

  // Получение значения часов для конкретной ячейки
  const getHours = (disciplineId: number, semester: number): number => {
    const key = `${disciplineId}_${semester}`;
    return hours[key] || 0;
  };

  return (
    <div className="overflow-auto border rounded-lg curr-plan plan-wrapper">
      <table className="w-full table-fixed border-collapse select-none">
        <thead className="bg-slate-800 text-white">
          <tr>
            <th className="sticky left-0 top-0 bg-slate-800 p-2 z-30 min-w-[200px]">Дисциплины</th>
            {semesters.map(s => (
              <th key={s} className="sticky top-0 z-20 w-16 px-2 py-1 text-center border-l border-slate-700/20 dark:border-slate-600/40">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.disciplines.map(d => (
            <tr key={d.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-600/10">
              <td className="sticky left-0 bg-inherit p-2 font-medium z-10 border-t border-slate-700/20 dark:border-slate-600/40">
                {d.name}
              </td>
              {semesters.map(s => (
                <td key={s} className="w-16 p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-transparent text-center outline-none tabular-nums"
                    value={getHours(d.id, s)}
                    onChange={(e) => handleHoursChange(d.id, s, parseInt(e.target.value) || 0)}
                    onBlur={(e) => handleBlur(e, d.id, s)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}