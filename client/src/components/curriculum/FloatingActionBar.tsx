import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from "lucide-react";
import { ActivityType, ACTIVITY_TYPES } from "./WeekActivityDialog";

interface FloatingActionBarProps {
  selectedCells: Set<string>;
  getActivityStyle: (activity: ActivityType) => { bg: string, text: string };
  onActivityChange: (activity: ActivityType, applyToSelection: boolean) => void;
  clearSelection: () => void;
  headerRef: React.RefObject<HTMLTableSectionElement>;
  getSelectionRect: (cells: Set<string>) => { top: number, left: number, width: number, height: number };
}

export function FloatingActionBar({
  selectedCells,
  getActivityStyle,
  onActivityChange,
  clearSelection,
  headerRef,
  getSelectionRect
}: FloatingActionBarProps) {
  // Ссылка на div панели для измерения её ширины
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Определяем root элемент для портала
  const portalRoot = document.getElementById('portal-root') ?? document.body;

  // Вычисляем позицию панели
  useEffect(() => {
    if (selectedCells.size > 0) {
      // Получаем размеры выделенной области
      const selectionRect = getSelectionRect(selectedCells);
      
      // Получаем позицию шапки таблицы
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      
      // Обновляем ширину панели если необходимо
      if (barRef.current && barWidth === 0) {
        setBarWidth(barRef.current.offsetWidth);
      }
      
      // Центрируем по горизонтали
      const centerX = selectionRect.left + selectionRect.width / 2 - (barWidth / 2);
      
      // Устанавливаем позицию над выделением с отступом
      const top = selectionRect.top - 8; // отступ 8px
      
      setPosition({
        left: centerX,
        top: Math.max(top, headerBottom + 8) // не выше шапки таблицы
      });
    }
  }, [selectedCells, getSelectionRect, headerRef, barWidth]);

  // Если нет выделенных ячеек, не рендерим панель
  if (selectedCells.size === 0) {
    return null;
  }

  // Создаем портал для абсолютного позиционирования относительно viewport
  return createPortal(
    <div 
      ref={barRef}
      className="action-bar"
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 60, // Выше тултипа
      }}
    >
      <span className="mr-2 text-sm">Выбрано {selectedCells.size} недель:</span>
      
      {/* Кнопки активностей */}
      {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
        const { bg } = getActivityStyle(code as ActivityType);
        return (
          <button
            key={code}
            className={`${bg} w-8 h-8 rounded font-semibold hover:ring-2 hover:ring-slate-400/50 dark:hover:ring-white/50 transition-all`}
            onClick={() => onActivityChange(code as ActivityType, true)}
            title={description}
          >
            {code}
          </button>
        );
      })}
      
      {/* Кнопка очистки */}
      <button
        className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 px-2 rounded text-sm hover:ring-2 hover:ring-slate-400/50 dark:hover:ring-white/50 transition-all"
        onClick={() => onActivityChange("", true)}
      >
        Очистить
      </button>
      
      {/* Кнопка закрытия (снимает выделение) */}
      <button
        className="ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1 transition-colors"
        onClick={clearSelection}
        title="Снять выделение"
      >
        <X size={16} />
      </button>
    </div>,
    portalRoot
  );
}