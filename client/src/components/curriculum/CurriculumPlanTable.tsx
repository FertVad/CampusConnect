import React, { useState, useEffect } from 'react';
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
  const semesters = Array.from(
    { length: courses * 2 + (extraMonths > 0 ? 1 : 0) },
    (_, i) => i + 1
  );

  // Обработчик изменения часов в ячейке
  const handleHoursChange = (disciplineId: number, semester: number, value: number) => {
    const key = `${disciplineId}_${semester}`;
    setHours(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Получение значения часов для конкретной ячейки
  const getHours = (disciplineId: number, semester: number): number => {
    const key = `${disciplineId}_${semester}`;
    return hours[key] || 0;
  };

  return (
    <div className="overflow-auto border rounded-lg curr-plan">
      <table className="min-w-max border-collapse text-sm">
        <thead className="bg-slate-800 text-white sticky top-0">
          <tr>
            <th className="sticky left-0 bg-slate-800 p-2 z-20">Дисциплины</th>
            {semesters.map(s => (
              <th key={s} className="p-2 w-20 text-center border-l">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.disciplines.map(d => (
            <tr key={d.id} className="odd:bg-slate-50 even:bg-slate-100 dark:odd:bg-slate-800/50 dark:even:bg-slate-700/50">
              <td className="sticky left-0 bg-inherit p-2 font-medium z-10">{d.name}</td>
              {semesters.map(s => (
                <td key={s} className="p-1 border-l text-center">
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-transparent text-center outline-none"
                    value={getHours(d.id, s)}
                    onChange={(e) => handleHoursChange(d.id, s, parseInt(e.target.value) || 0)}
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