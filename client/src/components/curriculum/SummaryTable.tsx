import React from "react";
import { ACTIVITY_TYPES, ActivityType } from "./ActivityTypes";
import { SummaryRow } from "@/utils/buildSummary";

export const SummaryTable: React.FC<{ summary: SummaryRow[]; courses: number }> = ({ summary, courses }) => (
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
        {Array.from({ length: courses }, (_, i) => (
          <React.Fragment key={i}>
            <th>Сем 1</th><th>Сем 2</th><th>Σ</th>
          </React.Fragment>
        ))}
      </tr>
    </thead>
    <tbody>
      {summary.map(r => (
        <tr key={r.activity} className="odd:bg-slate-50 dark:odd:bg-slate-800/40">
          <td className="sticky left-0 bg-slate-700 text-white px-3 py-1 whitespace-nowrap">
            {ACTIVITY_TYPES[r.activity]} ({r.activity})
          </td>
          {Array.from({ length: courses }, (_, i) => {
            const v = r.perCourse[i + 1] ?? { sem1: 0, sem2: 0, total: 0 };
            return (
              <React.Fragment key={i}>
                <td className="text-center">{v.sem1 || ""}</td>
                <td className="text-center">{v.sem2 || ""}</td>
                <td className="text-center font-semibold">{v.total || ""}</td>
              </React.Fragment>
            );
          })}
          <td className="text-center font-bold">{r.grandTotal}</td>
        </tr>
      ))}
    </tbody>
  </table>
);