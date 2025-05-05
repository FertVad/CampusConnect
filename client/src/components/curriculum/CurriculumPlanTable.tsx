import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreVertical, ChevronRight, ChevronDown, Trash, Edit, Plus, GripVertical, Check, X } from 'lucide-react';
import { PlanNode, Subject, CurriculumPlan, ActivityHours } from '@/types/curriculum';
import sampleData from '@/data/sampleCurrPlan.json';

// Тип для параметров компонента
interface Props {
  courses: number;
  extraMonths: number;
  initialData?: any;
  onPlanChange?: (planData: CurriculumPlan) => void;
  onDirtyChange?: (isDirty: boolean) => void; // Колбэк для отслеживания изменений в данных
}

// Интерфейс для узла с вычисленными суммами по семестрам
interface NodeWithSums {
  id: string;
  title: string;
  parentId: string | null;
  type: 'section' | 'group' | 'subject';
  orderIndex?: number;
  isCollapsed?: boolean;
  sums?: number[];
  depth?: number;
  hours?: number[]; // Для дисциплин
}

// Интерфейс для элемента, который перетаскивается
interface DragItem {
  id: string;
  type: 'section' | 'group' | 'subject';
  parentId: string | null;
}

// Компонент строки для дисциплины (конечный узел)
const SubjectRow: React.FC<{
  node: Subject;
  semesters: number[];
  isActive?: boolean;
  isSelected?: boolean; // Флаг для множественного выделения
  depth: number;
  isMultiSelectMode?: boolean; // Режим множественного выбора
  onValueChange: (id: string, semesterIndex: number, value: number, activityType?: keyof ActivityHours) => void;
  onControlTypeChange: (id: string, controlType: 'exam' | 'credit' | 'differentiated_credit' | 'coursework', index: number) => void;
  onTotalHoursChange: (id: string, totalHours: number) => void;
  onCreditUnitsChange: (id: string, creditUnits: number) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect?: (id: string, ctrlKey: boolean, shiftKey: boolean) => void; // Обработчик выбора элемента
}> = ({ 
  node, 
  semesters, 
  isActive, 
  isSelected, 
  depth, 
  isMultiSelectMode, 
  onValueChange, 
  onControlTypeChange,
  onTotalHoursChange,
  onCreditUnitsChange,
  onRename, 
  onDelete, 
  onSelect 
}) => {
  // Настройка сортировки элемента (для drag & drop)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: {
      type: node.type,
      parentId: node.parentId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Расчет отступа в зависимости от глубины
  const paddingLeft = 8 + depth * 20;

  // Обработчик потери фокуса для пустого поля
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, semesterIndex: number) => {
    if (e.target.value === '') {
      onValueChange(node.id, semesterIndex, 0);
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? 'curriculum-row-selected' : (isActive ? 'bg-blue-50 dark:bg-blue-900/20' : '')} 
        hover:bg-indigo-50/40 dark:hover:bg-indigo-600/10 transition-colors cursor-pointer`}
      onClick={(e) => onSelect && onSelect(node.id, e.ctrlKey || e.metaKey, e.shiftKey)}
    >
      <td className="sticky left-0 bg-inherit border-t border-slate-700/20 dark:border-slate-600/40 z-10">
        <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
          <span className="cursor-grab" {...attributes} {...listeners}>
            <GripVertical size={16} className="text-slate-400 mr-2 hover:text-blue-500 transition-colors" />
          </span>
          <span 
            className="font-normal text-blue-700 dark:text-blue-300 cursor-pointer" 
            onDoubleClick={() => onRename(node.id)}
          >
            {node.title}
          </span>
          <div className="ml-auto mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                  <MoreVertical size={16} className="text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRename(node.id)}>
                  <Edit size={16} className="mr-2" /> Переименовать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(node.id)}>
                  <Trash size={16} className="mr-2" /> Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </td>
      {/* Ячейка формы контроля */}
      <td className="p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
        <select
          className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 transition-colors rounded py-1"
          value={node.controlType?.[0] || 'credit'}
          onChange={(e) => {
            // Используем обработчик из props
            onControlTypeChange(
              node.id, 
              e.target.value as 'exam' | 'credit' | 'differentiated_credit' | 'coursework', 
              0 // Индекс семестра (сейчас используем только первый семестр)
            );
          }}
        >
          <option value="exam">Экзамен</option>
          <option value="credit">Зачет</option>
          <option value="differentiated_credit">Дифф.зачет</option>
          <option value="coursework">Курсовая</option>
        </select>
      </td>
      
      {/* Ячейка общего количества часов */}
      <td className="w-16 p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
        <input
          type="number"
          min={0}
          className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 tabular-nums transition-colors rounded py-1"
          value={node.totalHours ?? 0}
          onChange={(e) => {
            // Получаем новое значение
            const newValue = parseInt(e.target.value) || 0;
            
            // Используем обработчик из props
            onTotalHoursChange(node.id, newValue);
          }}
        />
      </td>
      
      {/* Ячейка зачетных единиц */}
      <td className="w-16 p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
        <input
          type="number"
          min={0}
          step="0.5"
          className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 tabular-nums transition-colors rounded py-1"
          value={node.creditUnits ?? 0}
          onChange={(e) => {
            // Получаем новое значение (с поддержкой дробных чисел)
            const newValue = parseFloat(e.target.value) || 0;
            
            // Используем обработчик из props
            onCreditUnitsChange(node.id, newValue);
          }}
        />
      </td>
      
      {/* Для каждого семестра выводим ячейки с типами занятий */}
      {semesters.map((s, semesterIndex) => {
        // Получаем данные о часах для текущего семестра
        const activityData = node.activityHours?.[semesterIndex] || {
          lectures: 0,
          practice: 0,
          laboratory: 0,
          selfStudy: 0,
          courseProject: 0,
          consultation: 0,
          total: node.hours[semesterIndex] || 0
        };
        
        // Создаем массив для всех типов занятий
        const activityTypes = [
          { key: 'lectures', label: 'Лек' },
          { key: 'practice', label: 'Пр' },
          { key: 'laboratory', label: 'Лаб' },
          { key: 'selfStudy', label: 'СП' },
          { key: 'courseProject', label: 'КРП' },
          { key: 'consultation', label: 'Конс' },
          { key: 'total', label: 'Итого' }
        ];
        
        // Возвращаем ячейки для каждого типа занятий
        return activityTypes.map((activity, activityIndex) => (
          <td 
            key={`${s}-${activity.key}`} 
            className="w-14 p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center"
          >
            <input
              type="number"
              min={0}
              className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 tabular-nums transition-colors rounded py-1"
              value={activityData[activity.key as keyof typeof activityData] || 0}
              onChange={(e) => {
                // Преобразуем значение в число
                const numValue = parseInt(e.target.value) || 0;
                
                if (activity.key === 'total') {
                  onValueChange(node.id, semesterIndex, numValue);
                } else {
                  onValueChange(node.id, semesterIndex, numValue, activity.key as keyof ActivityHours);
                }
              }}
              onBlur={(e) => {
                if (activity.key === 'total') {
                  handleBlur(e, semesterIndex);
                }
              }}
              // Делаем поле "Итого" выделенным
              style={{
                fontWeight: activity.key === 'total' ? 'bold' : 'normal',
                backgroundColor: activity.key === 'total' ? 'rgba(100, 116, 139, 0.1)' : 'transparent'
              }}
            />
          </td>
        ));
      })}
    </tr>
  );
};

// Компонент строки для разделов и групп (не конечные узлы)
const GroupRow: React.FC<{
  node: NodeWithSums;
  semesters: number[];
  isActive?: boolean;
  isSelected?: boolean; // Флаг для множественного выделения
  hasChildren: boolean;
  isSection: boolean;
  depth: number;
  hasError?: boolean; // Флаг ошибки (например, пустая группа)
  isMultiSelectMode?: boolean; // Режим множественного выбора
  onToggleCollapse: (id: string) => void;
  onAddChild: (parentId: string, type: 'section' | 'group' | 'subject') => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect?: (id: string, ctrlKey: boolean, shiftKey: boolean) => void; // Обработчик выбора элемента
}> = ({ 
  node, 
  semesters, 
  isActive, 
  isSelected,
  hasChildren, 
  isSection, 
  depth, 
  hasError,
  isMultiSelectMode,
  onToggleCollapse, 
  onAddChild, 
  onRename, 
  onDelete,
  onSelect
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: {
      type: node.type,
      parentId: node.parentId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Расчет отступа в зависимости от глубины
  const paddingLeft = 8 + depth * 20;

  // Стиль для фона в зависимости от наличия ошибки только
  let bgClass = '';
  
  // Если есть ошибка, применяем стиль ошибки
  if (hasError && !isSection) {
    bgClass = 'bg-red-100 dark:bg-red-900/20';
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? 'curriculum-row-selected' : (isActive ? 'bg-blue-50 dark:bg-blue-900/20' : '')} 
        hover:bg-indigo-50/40 dark:hover:bg-indigo-600/10 transition-colors cursor-pointer`}
      onClick={(e) => onSelect && onSelect(node.id, e.ctrlKey || e.metaKey, e.shiftKey)}
    >
      <td className="sticky left-0 bg-inherit border-t border-slate-700/20 dark:border-slate-600/40 z-10">
        <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
          {hasChildren ? (
            <button
              onClick={() => onToggleCollapse(node.id)}
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {node.isCollapsed ? (
                <ChevronRight size={16} className="text-slate-500" />
              ) : (
                <ChevronDown size={16} className="text-slate-500" />
              )}
            </button>
          ) : (
            <span className="w-6"></span>
          )}
          
          <span className="cursor-grab ml-1" {...attributes} {...listeners}>
            <GripVertical size={16} className="text-slate-400 mr-2 hover:text-blue-500 transition-colors" />
          </span>
          
          <span 
            className={`flex items-center gap-1 ${isSection ? 'font-semibold text-red-700 dark:text-red-400' : 'font-medium text-green-700 dark:text-green-400'} cursor-pointer`}
            onDoubleClick={() => onRename(node.id)}
          >
            {node.title}
            {hasError && !isSection && (
              <span className="ml-2 text-red-600 dark:text-red-400 text-xs" title="Группа не содержит дисциплин">
                (пустая группа)
              </span>
            )}
          </span>
          
          <div className="ml-auto mr-2 flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                  <MoreVertical size={16} className="text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isSection ? (
                  <DropdownMenuItem onClick={() => onAddChild(node.id, 'group')}>
                    <Plus size={16} className="mr-2" /> Добавить подгруппу
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onAddChild(node.id, 'subject')}>
                    <Plus size={16} className="mr-2" /> Добавить дисциплину
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onRename(node.id)}>
                  <Edit size={16} className="mr-2" /> Переименовать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(node.id)}>
                  <Trash size={16} className="mr-2" /> Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </td>
      {/* Колонки формы контроля, общих часов и зачетных единиц (пустые для разделов и групп) */}
      <td className="border-l border-t border-slate-700/20 dark:border-slate-600/40"></td>
      <td className="border-l border-t border-slate-700/20 dark:border-slate-600/40"></td>
      <td className="border-l border-t border-slate-700/20 dark:border-slate-600/40"></td>
      
      {/* Для каждого семестра выводим ячейки с суммами по типам занятий */}
      {semesters.map((s, semesterIndex) => {
        // Создаем массив для всех типов занятий
        const activityTypes = [
          { key: 'lectures', label: 'Лек' },
          { key: 'practice', label: 'Пр' },
          { key: 'laboratory', label: 'Лаб' },
          { key: 'selfStudy', label: 'СП' },
          { key: 'courseProject', label: 'КРП' },
          { key: 'consultation', label: 'Конс' },
          { key: 'total', label: 'Итого' }
        ];
        
        // Для каждого типа занятий выводим сумму
        return activityTypes.map((activity, activityIndex) => {
          // Используем единую сумму для всех типов (пока нет детализации по типам для групп и разделов)
          const sum = node.sums?.[semesterIndex] || 0;
          
          return (
            <td 
              key={`${s}-${activity.key}`} 
              className="w-14 p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center font-medium tabular-nums bg-inherit"
            >
              <span 
                className={`${
                  sum > 0 ? (isSection ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400') : 'text-slate-400 dark:text-slate-600'
                }`}
                style={{
                  fontWeight: activity.key === 'total' ? 'bold' : 'normal'
                }}
              >
                {/* Отображаем сумму только в колонке "Итого" */}
                {activity.key === 'total' ? sum : ''}
              </span>
            </td>
          );
        });
      })}
    </tr>
  );
};

// Главный компонент таблицы учебного плана
export const CurriculumPlanTable = React.forwardRef<{ forceUpdate: () => void }, Props>((props, ref) => {
  const { courses, extraMonths, initialData, onPlanChange, onDirtyChange } = props;
  // Состояние для времени последнего изменения (для debounce)
  const lastChangeTime = useRef<number>(0);
  // Идентификатор таймера автосохранения
  const saveTimeoutRef = useRef<number | null>(null);
  // Флаг для предотвращения повторных операций перетаскивания
  const isDraggingOperation = useRef<boolean>(false);
  
  // Подсчет числа семестров
  const semesters = useMemo(() => {
    const base = courses * 2;
    return Array.from(
      { length: base + (extraMonths > 0 ? 1 : 0) },
      (_, i) => i + 1
    );
  }, [courses, extraMonths]);

  // Инициализация данных
  const [planData, setPlanData] = useState<CurriculumPlan>(() => {
    return initialData?.planData || sampleData.planData;
  });

  // Выбранный узел (для контекстных операций)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Состояние для множественного выбора узлов
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  
  // Флаг множественного выбора (режим выбора нескольких элементов)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  
  // Состояние для узла, который перетаскивается (drag & drop)
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<PlanNode | null>(null);
  
  // Состояние для узлов с ошибками (пустые группы)
  const [nodesWithErrors, setNodesWithErrors] = useState<string[]>([]);
  
  // Состояние для редактирования названия
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editNodeTitle, setEditNodeTitle] = useState<string>('');
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);

  // Датчики для drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Минимальное расстояние для активации перетаскивания
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Функция для создания нового узла
  const createNewNode = useCallback((
    type: 'section' | 'group' | 'subject',
    parentId: string | null = null,
    orderIndex: number = 0
  ): PlanNode => {
    const id = uuidv4();
    
    let title = '';
    switch (type) {
      case 'section':
        title = 'Новый раздел';
        break;
      case 'group':
        title = 'Новая группа дисциплин';
        break;
      case 'subject':
        title = 'Новая дисциплина';
        break;
    }
    
    if (type === 'subject') {
      return {
        id,
        title,
        parentId,
        type,
        orderIndex,
        hours: Array(semesters.length).fill(0)
      } as Subject;
    } else {
      return {
        id,
        title,
        parentId,
        type,
        orderIndex,
        isCollapsed: false
      };
    }
  }, [semesters.length]);

  // Обработчик добавления нового узла
  // Оригинальный обработчик добавления узлов
  const addNode = useCallback((type: 'section' | 'group' | 'subject', parentId: string | null = null) => {
    console.log(`[CurriculumPlanTable] Adding new node of type: ${type}, parentId: ${parentId}`);
    
    setPlanData(prevData => {
      // Находим максимальный orderIndex для новых элементов с тем же родителем
      const siblingNodes = prevData.filter(node => node.parentId === parentId);
      const maxOrderIndex = siblingNodes.length > 0
        ? Math.max(...siblingNodes.map(node => node.orderIndex || 0))
        : -1;
      
      const newIndex = maxOrderIndex + 1;
      console.log(`[CurriculumPlanTable] New node will have orderIndex: ${newIndex}`);
      
      // Создаем новый узел
      const newNode = createNewNode(type, parentId, newIndex);
      console.log(`[CurriculumPlanTable] Created new node:`, newNode);
      
      // Добавляем его в план
      return [...prevData, newNode];
    });
  }, [createNewNode]);

  // Последний выбранный элемент для использования с Shift
  const lastSelectedNodeRef = useRef<string | null>(null);

  // Функция для очистки множественного выбора
  const clearSelection = useCallback(() => {
    setSelectedNodes(new Set());
    setIsMultiSelectMode(false);
  }, []);

  // Функция для активации режима множественного выбора
  const enableMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(true);
    // Если есть выбранный узел, добавляем его в множественное выделение
    if (selectedNodeId) {
      setSelectedNodes(new Set([selectedNodeId]));
    }
  }, [selectedNodeId]);

  // Обработчик удаления узла (и всех его потомков)
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Если включен режим множественного выбора и есть выбранные узлы, удаляем их все
    if (isMultiSelectMode && selectedNodes.size > 0) {
      // Если текущий узел не находится в выбранных, добавляем его
      if (!selectedNodes.has(nodeId)) {
        selectedNodes.add(nodeId);
      }
      
      setPlanData(prevData => {
        // Создаем копию для обновления
        const newData = [...prevData];
        
        // Находим узлы для удаления (сам узел и все его дочерние, рекурсивно)
        const nodesToDelete = new Set<string>();
        
        // Рекурсивная функция для поиска всех дочерних узлов
        const findChildren = (id: string) => {
          nodesToDelete.add(id);
          
          // Находим прямых потомков
          const children = newData.filter(node => node.parentId === id);
          
          // Рекурсивно добавляем их детей
          children.forEach(child => findChildren(child.id));
        };
        
        // Удаляем все выбранные узлы
        selectedNodes.forEach(id => {
          findChildren(id);
        });
        
        // Очищаем выбранные узлы после удаления
        setSelectedNodes(new Set());
        setIsMultiSelectMode(false);
        
        // Отфильтровываем все помеченные для удаления узлы
        return newData.filter(node => !nodesToDelete.has(node.id));
      });
    } else {
      // Обычное удаление одного узла
      setPlanData(prevData => {
        // Создаем копию для обновления
        const newData = [...prevData];
        
        // Находим узлы для удаления (сам узел и все его дочерние, рекурсивно)
        const nodesToDelete = new Set<string>();
        
        // Рекурсивная функция для поиска всех дочерних узлов
        const findChildren = (id: string) => {
          nodesToDelete.add(id);
          
          // Находим прямых потомков
          const children = newData.filter(node => node.parentId === id);
          
          // Рекурсивно добавляем их детей
          children.forEach(child => findChildren(child.id));
        };
        
        // Начинаем с указанного узла
        findChildren(nodeId);
        
        // Отфильтровываем все помеченные для удаления узлы
        return newData.filter(node => !nodesToDelete.has(node.id));
      });
    }
  }, [isMultiSelectMode, selectedNodes]);

  // Обработчик изменения значения часов для дисциплины
  const handleValueChange = useCallback((
    nodeId: string, 
    semesterIndex: number, 
    value: number, 
    activityType: keyof ActivityHours = 'total'
  ) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && node.type === 'subject') {
          const subject = node as Subject;
          
          // Создаем новый массив часов с обновленным значением (для обратной совместимости)
          const newHours = [...subject.hours];
          
          // Новая структура активностей для всех семестров
          const newActivityHours = subject.activityHours 
            ? [...subject.activityHours] 
            : Array(newHours.length).fill(null).map((_, i) => ({
                lectures: 0,
                practice: 0,
                laboratory: 0,
                selfStudy: 0,
                courseProject: 0,
                consultation: 0,
                total: subject.hours[i] || 0
              }));
          
          // Если семестра нет в массиве, расширяем массив
          while (newActivityHours.length <= semesterIndex) {
            newActivityHours.push({
              lectures: 0,
              practice: 0,
              laboratory: 0,
              selfStudy: 0,
              courseProject: 0,
              consultation: 0,
              total: 0
            });
          }
          
          // Обновляем значение для указанного типа активности
          if (activityType === 'total') {
            // Если обновляем общую сумму, обновляем также и старое поле hours
            newHours[semesterIndex] = value;
            newActivityHours[semesterIndex].total = value;
          } else {
            // Если обновляем конкретный тип активности
            newActivityHours[semesterIndex] = {
              ...newActivityHours[semesterIndex],
              [activityType]: value
            };
            
            // Пересчитываем общую сумму
            const total = Object.entries(newActivityHours[semesterIndex])
              .filter(([key]) => key !== 'total')
              .reduce((sum, [_, val]) => sum + (val as number), 0);
              
            newActivityHours[semesterIndex].total = total;
            newHours[semesterIndex] = total;
          }
          
          // Возвращаем обновленный узел с расширенными данными
          return {
            ...subject,
            hours: newHours,
            activityHours: newActivityHours
          } as Subject;
        }
        return node;
      });
    });
  }, []);

  // Обработчик изменения формы контроля
  const handleControlTypeChange = useCallback((
    nodeId: string,
    controlType: 'exam' | 'credit' | 'differentiated_credit' | 'coursework',
    semesterIndex: number
  ) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && node.type === 'subject') {
          const subject = node as Subject;
          
          // Создаем новый массив форм контроля или используем существующий
          const newControlType = subject.controlType ? [...subject.controlType] : [];
          
          // Обновляем значение для указанного семестра
          newControlType[semesterIndex] = controlType;
          
          return {
            ...subject,
            controlType: newControlType
          };
        }
        return node;
      });
    });
    
    // Помечаем, что данные были изменены
    setIsDirty(true);
  }, []);
  
  // Обработчик изменения общего количества часов
  const handleTotalHoursChange = useCallback((nodeId: string, totalHours: number) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && node.type === 'subject') {
          return {
            ...node,
            totalHours
          } as Subject;
        }
        return node;
      });
    });
    
    // Помечаем, что данные были изменены
    setIsDirty(true);
  }, []);
  
  // Обработчик изменения зачетных единиц
  const handleCreditUnitsChange = useCallback((nodeId: string, creditUnits: number) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && node.type === 'subject') {
          return {
            ...node,
            creditUnits
          } as Subject;
        }
        return node;
      });
    });
    
    // Помечаем, что данные были изменены
    setIsDirty(true);
  }, []);

  // Обработчик сворачивания/разворачивания узла
  const handleToggleCollapse = useCallback((nodeId: string) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && (node.type === 'section' || node.type === 'group')) {
          return {
            ...node,
            isCollapsed: !node.isCollapsed
          };
        }
        return node;
      });
    });
  }, []);

  // Обработчик открытия диалога редактирования
  const openEditDialog = useCallback((nodeId: string) => {
    const node = planData.find(n => n.id === nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setEditNodeTitle(node.title);
      setShowEditDialog(true);
    }
  }, [planData]);
  
  // Обработчик подтверждения редактирования
  const confirmEdit = useCallback(() => {
    if (editingNodeId && editNodeTitle.trim() !== '') {
      setPlanData(prevData => {
        const updatedData = prevData.map(node => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              title: editNodeTitle.trim()
            };
          }
          return node;
        });
        
        // Принудительно сохраняем данные сразу после редактирования
        if (onPlanChange) {
          // Сделаем глубокую копию для избежания проблем с ссылками
          const dataCopy = JSON.parse(JSON.stringify(updatedData));
          
          // Сохраняем в глобальной переменной
          if (typeof window !== 'undefined') {
            window._lastPlanData = JSON.stringify({ 
              schemaVersion: 1, 
              planData: dataCopy 
            });
          }
          
          // Вызываем колбэк для сохранения
          setTimeout(() => {
            onPlanChange(dataCopy);
          }, 10);
        }
        
        return updatedData;
      });
      
      setShowEditDialog(false);
      setEditingNodeId(null);
      setEditNodeTitle('');
    }
  }, [editingNodeId, editNodeTitle, onPlanChange]);
  
  // Обработчик переименования узла
  const handleRename = useCallback((nodeId: string) => {
    openEditDialog(nodeId);
  }, [openEditDialog]);

  // Адаптер для добавления нового узла, соответствующий интерфейсу GroupRow
  const handleAddNode = useCallback((type: 'section' | 'group' | 'subject', parentId: string | null = null) => {
    addNode(type, parentId);
  }, [addNode]);

  // Обработчик начала перетаскивания
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Найти активный узел
    const node = planData.find(n => n.id === active.id);
    if (node) {
      setActiveNode(node);
    }
  };

  // Обработчик завершения перетаскивания
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeItem = active.data.current as DragItem;
      const activeParentId = activeItem.parentId;
      
      const overNodeId = over.id as string;
      const overNode = planData.find(n => n.id === overNodeId);
      
      if (overNode) {
        // Проверяем, что мы не перетаскиваем раздел внутрь группы и узел не перетаскивается внутрь себя
        const canDrop = (
          // Не можем перетащить раздел в группу
          !(activeItem.type === 'section' && overNode.type !== 'section') &&
          // Не можем перетащить группу в дисциплину
          !(activeItem.type === 'group' && overNode.type === 'subject') &&
          // Родитель должен совпадать (перемещение только на одном уровне)
          overNode.parentId === activeParentId
        );
        
        if (canDrop) {
          // Защита от повторных вызовов - если уже идет операция, не начинаем новую
          if (isDraggingOperation.current) {
            console.log("[CurriculumPlanTable] Drag operation already in progress, skipping...");
            return;
          }
          
          isDraggingOperation.current = true;
          
          setPlanData(prevData => {
            // Проверяем, перетаскиваем ли мы выбранные узлы
            const isMovingSelection = isMultiSelectMode && selectedNodes.has(active.id as string);
            
            if (isMovingSelection && selectedNodes.size > 1) {
              // Перемещение нескольких выбранных элементов
              console.log("[CurriculumPlanTable] Moving multiple selected nodes");
              
              // Создаем копию массива
              let newItems = [...prevData];
              
              // Получаем список всех выбранных элементов
              const selectedItemsData = prevData.filter(node => selectedNodes.has(node.id));
              
              // Сортируем элементы по их текущим индексам
              selectedItemsData.sort((a, b) => {
                const indexA = prevData.findIndex(n => n.id === a.id);
                const indexB = prevData.findIndex(n => n.id === b.id);
                return indexA - indexB;
              });
              
              // Находим индекс узла "над" которым мы перетаскиваем
              const overIndex = newItems.findIndex(n => n.id === over.id);
              
              // Удаляем все выбранные элементы из массива (в порядке от большего индекса к меньшему)
              const selectedIndices = selectedItemsData
                .map(node => newItems.findIndex(n => n.id === node.id))
                .sort((a, b) => b - a); // Сортируем в обратном порядке
              
              // Удаляем выбранные элементы из массива
              const removedItems: PlanNode[] = [];
              selectedIndices.forEach(index => {
                if (index !== -1) {
                  const [removed] = newItems.splice(index, 1);
                  removedItems.unshift(removed); // Добавляем в начало, чтобы сохранить порядок
                }
              });
              
              // Вставляем все выбранные элементы на новую позицию
              let insertIndex = overIndex;
              // Если перетаскиваем ниже, корректируем позицию с учетом удаленных элементов
              if (insertIndex > selectedIndices[selectedIndices.length - 1]) {
                insertIndex -= selectedIndices.filter(i => i < insertIndex).length;
              }
              
              newItems.splice(insertIndex, 0, ...removedItems);
              
              // Обновляем orderIndex для всех узлов с тем же родителем
              const parentId = activeParentId;
              const siblings = newItems.filter(n => n.parentId === parentId);
              
              siblings.forEach((node, index) => {
                // Находим этот узел в массиве и обновляем его orderIndex
                const nodeIndex = newItems.findIndex(n => n.id === node.id);
                if (nodeIndex !== -1) {
                  newItems[nodeIndex] = {
                    ...newItems[nodeIndex],
                    orderIndex: index
                  };
                }
              });
              
              // Очищаем выбранные узлы после перемещения
              // Оставляем режим множественного выбора активным
              
              // Завершаем операцию перетаскивания
              setTimeout(() => {
                isDraggingOperation.current = false;
              }, 100);
              
              return newItems;
            } else {
              // Обычное перемещение одного узла
              // Находим оригинальный индекс активного узла
              const activeIndex = prevData.findIndex(n => n.id === active.id);
              
              // Находим индекс узла "над" которым мы перетаскиваем
              const overIndex = prevData.findIndex(n => n.id === over.id);
              
              // Проверка на валидные индексы
              if (activeIndex === -1 || overIndex === -1) {
                console.log("[CurriculumPlanTable] Invalid indices:", { activeIndex, overIndex });
                return prevData; // Ничего не меняем
              }
              
              // Создаем копию массива
              const newItems = [...prevData];
              
              // Вынимаем активный узел
              const [activeNode] = newItems.splice(activeIndex, 1);
              
              // Вставляем его на новую позицию
              newItems.splice(overIndex, 0, activeNode);
              
              // Обновляем orderIndex для всех узлов с тем же родителем
              const parentId = activeNode.parentId;
              const siblings = newItems.filter(n => n.parentId === parentId);
              
              siblings.forEach((node, index) => {
                // Находим этот узел в массиве и обновляем его orderIndex
                const nodeIndex = newItems.findIndex(n => n.id === node.id);
                if (nodeIndex !== -1) {
                  newItems[nodeIndex] = {
                    ...newItems[nodeIndex],
                    orderIndex: index
                  };
                }
              });
              
              // Завершаем операцию перетаскивания
              setTimeout(() => {
                isDraggingOperation.current = false;
              }, 100);
              
              // Не вызываем onPlanChange напрямую, т.к. это вызовет эффект выше
              // Он сам обнаружит изменения и вызовет сохранение
              return newItems;
            }
          });
        }
      }
    }
    
    // Сбрасываем состояние перетаскивания
    setActiveId(null);
    setActiveNode(null);
  };

  // Функция для проверки пустых групп
  const validateEmptyGroups = useCallback(() => {
    // Находим все группы (не секции), у которых нет дочерних элементов
    const emptyGroups = planData.filter(node => {
      // Только для группы (не секции и не дисциплины)
      if (node.type !== 'group') return false;
      
      // Проверяем наличие дочерних элементов
      const hasChildren = planData.some(child => child.parentId === node.id);
      return !hasChildren;
    });
    
    // Обновляем список узлов с ошибками
    setNodesWithErrors(emptyGroups.map(node => node.id));
    
    return emptyGroups.length > 0;
  }, [planData]);
  
  // Запускаем валидацию при изменении данных
  useEffect(() => {
    validateEmptyGroups();
  }, [validateEmptyGroups]);


  
  // Подготовка иерархии и расчет сумм часов
  const { hierarchicalData, flattenedData } = useMemo(() => {
    // Сортируем узлы по orderIndex
    const sorted = [...planData].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    // Вычисляем суммы для разделов и групп
    const withSums: NodeWithSums[] = [];
    
    // Карта для хранения сумм часов по ID узла
    const sumsByNodeId: Record<string, number[]> = {};
    
    // Инициализируем массивы сумм для всех узлов (начальное значение - нули)
    sorted.forEach(node => {
      sumsByNodeId[node.id] = Array(semesters.length).fill(0);
    });
    
    // Сначала обрабатываем листовые узлы (дисциплины)
    sorted.forEach(node => {
      if (node.type === 'subject') {
        const subject = node as Subject;
        
        // Устанавливаем суммы для дисциплин (просто копия hours)
        sumsByNodeId[node.id] = [...subject.hours];
        
        // Добавляем часы дисциплины к суммам родительских групп
        if (node.parentId) {
          for (let i = 0; i < semesters.length; i++) {
            sumsByNodeId[node.parentId][i] += subject.hours[i] || 0;
          }
        }
      }
    });
    
    // Затем обрабатываем группы (чтобы включить их суммы в разделы)
    sorted.forEach(node => {
      if (node.type === 'group' && node.parentId) {
        // Добавляем суммы групп к суммам родительских разделов
        for (let i = 0; i < semesters.length; i++) {
          sumsByNodeId[node.parentId][i] += sumsByNodeId[node.id][i];
        }
      }
    });
    
    // Строим плоский список с суммами и информацией о глубине
    sorted.forEach(node => {
      const nodeWithSums: NodeWithSums = { ...node };
      
      // Добавляем суммы
      if (node.type !== 'subject') {
        nodeWithSums.sums = sumsByNodeId[node.id];
      }
      
      // Вычисляем глубину узла
      let depth = 0;
      if (node.type === 'group') depth = 1;
      if (node.type === 'subject') {
        // Находим родителя
        const parent = sorted.find(n => n.id === node.parentId);
        // Если родитель - группа, а группа в разделе, то depth = 2
        depth = parent?.type === 'group' ? 2 : 1;
      }
      
      nodeWithSums.depth = depth;
      withSums.push(nodeWithSums);
    });
    
    // Строим плоский список с учетом свернутых узлов
    const flattened: NodeWithSums[] = [];
    
    // Рекурсивная функция для добавления узлов в плоский список
    const addToFlattened = (nodes: NodeWithSums[], parentId: string | null = null) => {
      // Фильтруем узлы для текущего уровня
      const levelNodes = nodes.filter(node => node.parentId === parentId);
      
      // Добавляем узлы в плоский список
      levelNodes.forEach(node => {
        flattened.push(node);
        
        // Если узел не свернут и это не дисциплина, добавляем его детей
        if (!node.isCollapsed && node.type !== 'subject') {
          addToFlattened(nodes, node.id);
        }
      });
    };
    
    // Начинаем с корневых узлов
    addToFlattened(withSums);
    
    return { hierarchicalData: withSums, flattenedData: flattened };
  }, [planData, semesters.length]);

  // Отслеживаем изменения данных и сохраняем только при явных изменениях
  // Вместо постоянного автосохранения при каждом изменении planData
  const isInitialMount = useRef(true);
  const previousPlanDataRef = useRef<CurriculumPlan | null>(null);
  
  // Упрощенное локальное состояние для отслеживания грязных данных
  const [localIsDirty, setLocalIsDirty] = useState(false);
  // Таймер для debounce вызова onDirtyChange
  const dirtyTimeoutRef = useRef<number | null>(null);
  
  // Функция для сравнения предыдущих и текущих данных
  const hasPlanDataChanged = useCallback(() => {
    if (!previousPlanDataRef.current) return false;
    
    // Быстрая проверка количества элементов
    if (previousPlanDataRef.current.length !== planData.length) {
      return true;
    }
    
    // Сравниваем только основные свойства, исключая UI-состояния
    const prevFiltered = previousPlanDataRef.current.map(node => {
      const { isCollapsed, ...rest } = node as any;
      return rest;
    });
    
    const currentFiltered = planData.map(node => {
      const { isCollapsed, ...rest } = node as any;
      return rest;
    });
    
    // Строковое сравнение только необходимых свойств
    const prevString = JSON.stringify(prevFiltered);
    const currentString = JSON.stringify(currentFiltered);
    
    return prevString !== currentString;
  }, [planData]);

  // Эффект для обновления локального isDirty состояния
  useEffect(() => {
    // Пропускаем первый рендер
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousPlanDataRef.current = JSON.parse(JSON.stringify(planData));
      return;
    }
    
    // Проверяем наличие изменений
    const isDirty = hasPlanDataChanged();
    
    // Обновляем локальное состояние
    setLocalIsDirty(isDirty);
    
    // Используем debounce для вызова onDirtyChange, чтобы не вызывать его слишком часто
    if (dirtyTimeoutRef.current) {
      window.clearTimeout(dirtyTimeoutRef.current);
    }
    
    dirtyTimeoutRef.current = window.setTimeout(() => {
      // Вызываем колбэк только если он существует
      if (onDirtyChange) {
        onDirtyChange(isDirty);
      }
      dirtyTimeoutRef.current = null;
    }, 300); // 300ms debounce
    
    // Если есть реальные изменения, обрабатываем их для автосохранения
    if (isDirty && onPlanChange) {
      // Отменяем предыдущий таймер сохранения, если он есть
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      
      // Запоминаем время последнего изменения
      lastChangeTime.current = Date.now();
      
      // Устанавливаем новый таймер для сохранения через 1000 мс
      saveTimeoutRef.current = window.setTimeout(() => {
        // Делаем глубокую копию данных для сохранения, чтобы избежать проблем с ссылками
        const planDataCopy = JSON.parse(JSON.stringify(planData));
        console.log("[CurriculumPlanTable] Saving plan data...", {
          nodesCount: planDataCopy.length,
          firstNode: planDataCopy[0]?.title || 'unknown'
        });
        
        // КРИТИЧЕСКИ ВАЖНО: Сохраняем копию данных в глобальной переменной для надежного доступа
        if (typeof window !== 'undefined') {
          // @ts-ignore Добавляем глобальную переменную для сохранения последних данных
          window._lastPlanData = JSON.stringify({ 
            schemaVersion: 1, 
            planData: planDataCopy 
          });
          console.log("[CurriculumPlanTable] Global data backup saved, length:", window._lastPlanData?.length || 0);
        }
        
        // Вызываем родительский обработчик с копией данных
        onPlanChange(planDataCopy);
        
        // Обновляем предыдущее состояние после сохранения
        previousPlanDataRef.current = planDataCopy;
        saveTimeoutRef.current = null;
      }, 1000);
    }
    
    // Очищаем таймеры при размонтировании
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      if (dirtyTimeoutRef.current !== null) {
        window.clearTimeout(dirtyTimeoutRef.current);
      }
    };
  }, [planData, hasPlanDataChanged, onPlanChange]);

  // Метод forceUpdate для принудительного обновления данных из родительского компонента
  // Это решает проблему потери данных при переключении вкладок
  useEffect(() => {
    if (!ref) return;
    
    // Экспортируем метод forceUpdate через ref интерфейс
    // Родительский компонент может вызвать его, чтобы принудительно сохранить последние изменения
    (ref as any).current = {
      forceUpdate: () => {
        console.log("[CurriculumPlanTable] forceUpdate called from parent component");
        
        // Делаем глубокую копию данных
        const planDataCopy = JSON.parse(JSON.stringify(planData));
        
        // Обновляем глобальную переменную в window
        if (typeof window !== 'undefined') {
          // Сохраняем данные в глобальной переменной для доступа из других компонентов
          window._lastPlanData = JSON.stringify({ 
            schemaVersion: 1, 
            planData: planDataCopy,
            timestamp: Date.now()
          });
          console.log("[CurriculumPlanTable] Global data updated in forceUpdate, length:", window._lastPlanData?.length || 0);
        }
        
        // Вызываем родительский обработчик изменений, если он предоставлен
        if (onPlanChange) {
          onPlanChange(planDataCopy);
          console.log("[CurriculumPlanTable] Parent onPlanChange triggered from forceUpdate");
        }
      }
    };
  }, [ref, planData, onPlanChange]);

  // Сортированные ID для SortableContext
  const sortedIds = useMemo(() => {
    return flattenedData.map(node => node.id);
  }, [flattenedData]);
  
  // Обработчик множественного выбора элементов
  const handleSelectNode = useCallback((nodeId: string, ctrlKey: boolean, shiftKey: boolean) => {
    // Если нажат Shift, выделяем диапазон
    if (shiftKey && lastSelectedNodeRef.current) {
      const lastSelectedNodeId = lastSelectedNodeRef.current;
      
      // Активируем режим множественного выбора, если он еще не активен
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true);
      }
      
      // Получаем плоский список элементов для определения диапазона
      const flatList = flattenedData;
      const startIdx = flatList.findIndex((node) => node.id === lastSelectedNodeId);
      const endIdx = flatList.findIndex((node) => node.id === nodeId);
      
      if (startIdx !== -1 && endIdx !== -1) {
        // Определяем границы диапазона
        const [minIdx, maxIdx] = startIdx < endIdx 
          ? [startIdx, endIdx] 
          : [endIdx, startIdx];
        
        // Создаем новый набор выделенных узлов с элементами из диапазона
        const newSelection = new Set<string>();
        
        for (let i = minIdx; i <= maxIdx; i++) {
          if (flatList[i]) {
            newSelection.add(flatList[i].id);
          }
        }
        
        setSelectedNodes(newSelection);
      }
    }
    // Если нажат Ctrl/Command, добавляем/убираем из выделения
    else if (ctrlKey) {
      setSelectedNodes(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(nodeId)) {
          newSelection.delete(nodeId);
        } else {
          newSelection.add(nodeId);
        }
        return newSelection;
      });

      // Если выделение стало пустым, выходим из режима множественного выбора
      setSelectedNodes(prev => {
        if (prev.size === 0) {
          setIsMultiSelectMode(false);
        } else {
          setIsMultiSelectMode(true);
        }
        return prev;
      });
      
      // Обновляем последний выбранный элемент
      lastSelectedNodeRef.current = nodeId;
    } else {
      // Если Ctrl не нажат и не Shift, работаем с одиночным выбором
      if (isMultiSelectMode) {
        // Если уже в режиме множественного выбора
        if (selectedNodes.has(nodeId)) {
          // Если элемент уже выбран, снимаем выделение
          setSelectedNodes(prev => {
            const newSelection = new Set(prev);
            newSelection.delete(nodeId);
            if (newSelection.size === 0) {
              setIsMultiSelectMode(false);
            }
            return newSelection;
          });
        } else {
          // Добавляем элемент в выделение
          setSelectedNodes(prev => {
            const newSelection = new Set(prev);
            newSelection.add(nodeId);
            return newSelection;
          });
        }
      } else {
        // Обычный выбор элемента
        setSelectedNodeId(nodeId);
      }
      
      // Обновляем последний выбранный элемент
      lastSelectedNodeRef.current = nodeId;
    }
  }, [isMultiSelectMode, selectedNodes, flattenedData]);

  return (
    <div className="space-y-4">
      {/* Панель инструментов в верхней части */}
      <div className="flex justify-between items-center mb-2">
        {/* Кнопки для работы с выделением */}
        <div className="flex items-center gap-2">
          {isMultiSelectMode ? (
            <>
              <Button 
                variant="destructive" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  // Удаляем все выбранные элементы
                  if (selectedNodes.size > 0) {
                    handleDeleteNode(Array.from(selectedNodes)[0]);
                  }
                }}
              >
                <Trash size={16} /> Удалить выбранные ({selectedNodes.size})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearSelection}
              >
                Отменить выбор
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={enableMultiSelectMode}
            >
              Выбрать несколько
            </Button>
          )}
        </div>
        
        {/* Кнопка добавления нового элемента */}
        <Popover>
          <PopoverTrigger asChild>
            <Button className="gap-2">
              <PlusCircle size={16} /> Добавить
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="flex flex-col">
              <Button 
                variant="ghost" 
                className="justify-start gap-2 rounded-none"
                onClick={() => {
                  // Всегда добавляем новый раздел только в корень (null parentId)
                  // Разделы всегда должны быть на верхнем уровне
                  addNode('section', null);
                }}
              >
                <Plus size={16} /> Раздел
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start gap-2 rounded-none"
                onClick={() => {
                  // Группы должны добавляться только внутри разделов
                  if (selectedNodeId) {
                    const selectedNode = planData.find(n => n.id === selectedNodeId);
                    if (selectedNode) {
                      if (selectedNode.type === 'section') {
                        // Если выбран раздел, добавляем группу внутрь него
                        addNode('group', selectedNode.id);
                        return;
                      } else if (selectedNode.type === 'group') {
                        // Если выбрана группа, добавляем группу на том же уровне (у того же родителя)
                        addNode('group', selectedNode.parentId);
                        return;
                      } else if (selectedNode.type === 'subject') {
                        // Если выбран предмет, находим его родителя (группу) и добавляем группу на этом же уровне
                        const parentId = selectedNode.parentId;
                        if (parentId) {
                          const parentNode = planData.find(n => n.id === parentId);
                          if (parentNode && parentNode.type === 'group') {
                            addNode('group', parentNode.parentId);
                            return;
                          }
                        }
                      }
                    }
                  }
                  
                  // Если ничего не выбрано или неправильный выбор, ищем первый раздел
                  const firstSection = planData.find(n => n.type === 'section');
                  if (firstSection) {
                    // Если есть хотя бы один раздел, добавляем группу в него
                    addNode('group', firstSection.id);
                  } else {
                    // Если нет разделов, создаем сначала раздел, а потом группу
                    const newSectionId = uuidv4();
                    const newSection = {
                      id: newSectionId,
                      title: 'Новый раздел',
                      parentId: null,
                      type: 'section' as const,
                      orderIndex: 0,
                      isCollapsed: false
                    };
                    setPlanData(prev => [...prev, newSection]);
                    
                    // Добавляем группу в новый раздел
                    addNode('group', newSectionId);
                  }
                }}
              >
                <Plus size={16} /> Группа
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start gap-2 rounded-none"
                onClick={() => {
                  console.log("[CurriculumPlanTable] Добавить дисциплину - кнопка нажата");
                  console.log("[CurriculumPlanTable] Текущий выбранный узел:", selectedNodeId);
                  console.log("[CurriculumPlanTable] Доступные данные плана:", planData);
                  
                  // Дисциплины должны добавляться только внутри групп
                  if (selectedNodeId) {
                    const selectedNode = planData.find(n => n.id === selectedNodeId);
                    console.log("[CurriculumPlanTable] Выбранный узел:", selectedNode);
                    
                    if (selectedNode) {
                      if (selectedNode.type === 'group') {
                        // Если выбрана группа, добавляем дисциплину внутрь нее
                        console.log("[CurriculumPlanTable] Добавляем дисциплину в группу:", selectedNode.id);
                        addNode('subject', selectedNode.id);
                        return;
                      } else if (selectedNode.type === 'subject') {
                        // Если выбрана дисциплина, добавляем на том же уровне (в ту же группу)
                        console.log("[CurriculumPlanTable] Добавляем дисциплину рядом с дисциплиной, parentId:", selectedNode.parentId);
                        addNode('subject', selectedNode.parentId);
                        return;
                      } else if (selectedNode.type === 'section') {
                        // Если выбран раздел, ищем первую группу внутри него
                        console.log("[CurriculumPlanTable] Выбран раздел, ищем группу внутри него");
                        const firstGroup = planData.find(n => n.parentId === selectedNode.id && n.type === 'group');
                        if (firstGroup) {
                          // Если есть группа, добавляем в нее
                          console.log("[CurriculumPlanTable] Найдена группа в разделе, добавляем в нее:", firstGroup.id);
                          addNode('subject', firstGroup.id);
                        } else {
                          // Если нет группы, создаем новую и добавляем в нее
                          console.log("[CurriculumPlanTable] Группа в разделе не найдена, создаем новую");
                          const newGroupId = uuidv4();
                          const newGroup = {
                            id: newGroupId,
                            title: 'Новая группа дисциплин',
                            parentId: selectedNode.id,
                            type: 'group' as const,
                            orderIndex: 0,
                            isCollapsed: false
                          };
                          console.log("[CurriculumPlanTable] Созданная группа:", newGroup);
                          setPlanData(prev => {
                            console.log("[CurriculumPlanTable] Добавляем группу в данные плана, текущее количество узлов:", prev.length);
                            return [...prev, newGroup]
                          });
                          setTimeout(() => {
                            console.log("[CurriculumPlanTable] Добавляем дисциплину в новую группу:", newGroupId);
                            addNode('subject', newGroupId);
                          }, 50);
                        }
                        return;
                      }
                    }
                  }
                  
                  console.log("[CurriculumPlanTable] Узел не выбран или некорректный тип, ищем подходящую группу");
                  
                  // Если ничего не выбрано или неправильный выбор, ищем первую группу
                  const firstGroup = planData.find(n => n.type === 'group');
                  if (firstGroup) {
                    // Если есть хотя бы одна группа, добавляем дисциплину в нее
                    console.log("[CurriculumPlanTable] Найдена группа в плане, добавляем в нее:", firstGroup.id);
                    addNode('subject', firstGroup.id);
                  } else {
                    // Если нет групп, ищем первый раздел
                    console.log("[CurriculumPlanTable] Группы не найдены, ищем разделы");
                    const firstSection = planData.find(n => n.type === 'section');
                    if (firstSection) {
                      // Если есть раздел, создаем в нем группу, а затем добавляем предмет
                      console.log("[CurriculumPlanTable] Найден раздел, создаем в нем группу:", firstSection.id);
                      const newGroupId = uuidv4();
                      const newGroup = {
                        id: newGroupId,
                        title: 'Новая группа дисциплин',
                        parentId: firstSection.id,
                        type: 'group' as const,
                        orderIndex: 0,
                        isCollapsed: false
                      };
                      console.log("[CurriculumPlanTable] Новая группа:", newGroup);
                      setPlanData(prev => {
                        console.log("[CurriculumPlanTable] Добавляем группу в данные плана, текущее количество узлов:", prev.length);
                        return [...prev, newGroup];
                      });
                      setTimeout(() => {
                        console.log("[CurriculumPlanTable] Добавляем дисциплину в новую группу:", newGroupId);
                        addNode('subject', newGroupId);
                      }, 50);
                    } else {
                      // Если нет ни разделов, ни групп, создаем цепочку раздел -> группа -> дисциплина
                      console.log("[CurriculumPlanTable] Разделы не найдены, создаем новую иерархию");
                      const newSectionId = uuidv4();
                      const newSection = {
                        id: newSectionId,
                        title: 'Новый раздел',
                        parentId: null,
                        type: 'section' as const,
                        orderIndex: 0,
                        isCollapsed: false
                      };
                      
                      const newGroupId = uuidv4();
                      const newGroup = {
                        id: newGroupId,
                        title: 'Новая группа дисциплин',
                        parentId: newSectionId,
                        type: 'group' as const,
                        orderIndex: 0,
                        isCollapsed: false
                      };
                      
                      console.log("[CurriculumPlanTable] Новый раздел и группа:", { newSection, newGroup });
                      setPlanData(prev => {
                        console.log("[CurriculumPlanTable] Добавляем раздел и группу в данные плана, текущее количество узлов:", prev.length);
                        return [...prev, newSection, newGroup];
                      });
                      setTimeout(() => {
                        console.log("[CurriculumPlanTable] Добавляем дисциплину в новую группу:", newGroupId);
                        addNode('subject', newGroupId);
                      }, 50);
                    }
                  }
                }}
              >
                <Plus size={16} /> Дисциплина
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[]}
      >
        <div className="overflow-auto border rounded-lg curr-plan plan-wrapper max-h-[70vh]">
          <table className="w-full table-fixed border-collapse select-none text-sm">
            <thead>
              {/* Первый уровень заголовка: Дисциплины и курсы */}
              <tr className="bg-gradient-to-b from-slate-800 to-slate-700 text-white">
                <th 
                  className="sticky left-0 top-0 bg-gradient-to-b from-slate-800 to-slate-700 p-2 z-30 w-[280px] text-left"
                  rowSpan={3}
                >
                  <div className="text-[0.75rem] font-semibold">Дисциплины</div>
                </th>
                <th 
                  className="sticky top-0 z-20 px-2 py-1 text-center border-l border-slate-600/40 font-semibold text-[0.75rem]"
                  rowSpan={3}
                >
                  Форма контроля
                </th>
                <th 
                  className="sticky top-0 z-20 px-2 py-1 text-center border-l border-slate-600/40 font-semibold text-[0.75rem]"
                  rowSpan={3}
                >
                  Итого акад.часов
                </th>
                <th 
                  className="sticky top-0 z-20 px-2 py-1 text-center border-l border-slate-600/40 font-semibold text-[0.75rem]"
                  rowSpan={3}
                >
                  Объем ОП
                </th>
                
                {/* Блок курсов */}
                {Array.from({ length: courses }, (_, i) => {
                  const courseNum = i + 1;
                  const startSemester = i * 2 + 1;
                  const semestersInCourse = courseNum === courses && extraMonths > 0 ? 3 : 2;
                  
                  return (
                    <th 
                      key={`course-${courseNum}`}
                      className="sticky top-0 z-20 px-3 py-2 text-center border-l border-slate-600/40 font-semibold text-[0.75rem]"
                      colSpan={semestersInCourse * 4} // 4 колонки для каждого семестра (Л, Лб, П, КП)
                    >
                      Курс {courseNum}
                    </th>
                  );
                })}
              </tr>
              
              {/* Второй уровень заголовка: Семестры */}
              <tr className="bg-gradient-to-b from-slate-700 to-slate-600 text-white">
                {Array.from({ length: courses }, (_, i) => {
                  const courseNum = i + 1;
                  const startSemester = i * 2 + 1;
                  const semestersInCourse = courseNum === courses && extraMonths > 0 ? 3 : 2;
                  
                  // Создаем заголовки семестров для текущего курса
                  return Array.from({ length: semestersInCourse }, (_, j) => {
                    const semesterNum = startSemester + j;
                    const weeksCount = 18; // Предположим, что в каждом семестре 18 недель
                    
                    return (
                      <th 
                        key={`semester-${semesterNum}`}
                        className="sticky top-[calc(1rem+1px)] z-20 px-2 py-1 text-center border-l border-slate-600/40 font-semibold text-[0.75rem]"
                        colSpan={4} // 4 колонки типов занятий для каждого семестра
                        title={`Семестр ${semesterNum} (${weeksCount} недель)`}
                      >
                        С{semesterNum} ({weeksCount})
                      </th>
                    );
                  });
                })}
              </tr>
              
              {/* Третий уровень заголовка: Типы занятий */}
              <tr className="bg-gradient-to-b from-slate-600 to-slate-500 text-white">
                {Array.from({ length: semesters.length }, (_, i) => {
                  const semesterNum = i + 1;
                  
                  // Для каждого семестра создаем 4 колонки типов занятий
                  const activityTypes = [
                    { short: "Л", full: "Лекции" },
                    { short: "Лб", full: "Лабораторные" },
                    { short: "П", full: "Практические" },
                    { short: "КП", full: "Курсовые проекты" }
                  ];
                  
                  return activityTypes.map((activity, j) => (
                    <th 
                      key={`semester-${semesterNum}-activity-${j}`}
                      className="sticky top-[calc(2rem+2px)] z-20 w-12 px-1 py-2 text-center border-l border-slate-600/40 font-semibold text-[0.75rem]"
                      title={activity.full}
                    >
                      <div className="writing-mode-vertical">
                        {activity.short}
                      </div>
                    </th>
                  ));
                })}
              </tr>
            </thead>
            <tbody>
              <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
                {flattenedData.map(node => {
                  // Проверяем, есть ли у узла дочерние элементы
                  const hasChildren = planData.some(n => n.parentId === node.id);
                  
                  if (node.type === 'subject') {
                    return (
                      <SubjectRow
                        key={node.id}
                        node={node as Subject}
                        semesters={semesters}
                        isActive={node.id === selectedNodeId}
                        isSelected={selectedNodes.has(node.id)}
                        isMultiSelectMode={isMultiSelectMode}
                        depth={node.depth || 0}
                        onValueChange={handleValueChange}
                        onControlTypeChange={handleControlTypeChange}
                        onTotalHoursChange={handleTotalHoursChange}
                        onCreditUnitsChange={handleCreditUnitsChange}
                        onRename={handleRename}
                        onDelete={handleDeleteNode}
                        onSelect={handleSelectNode}
                      />
                    );
                  } else {
                    return (
                      <GroupRow
                        key={node.id}
                        node={node}
                        semesters={semesters}
                        isActive={node.id === selectedNodeId}
                        isSelected={selectedNodes.has(node.id)}
                        isMultiSelectMode={isMultiSelectMode}
                        hasChildren={hasChildren}
                        isSection={node.type === 'section'}
                        depth={node.depth || 0}
                        hasError={node.type === 'group' && nodesWithErrors.includes(node.id)}
                        onToggleCollapse={handleToggleCollapse}
                        onAddChild={(parentId, type) => handleAddNode(type, parentId)}
                        onRename={handleRename}
                        onDelete={handleDeleteNode}
                        onSelect={handleSelectNode}
                      />
                    );
                  }
                })}
              </SortableContext>
            </tbody>
          </table>
        </div>
        
        {/* Показываем контур перетаскиваемого элемента */}
        <DragOverlay>
          {activeId && activeNode && (
            activeNode.type === 'subject' ? (
              <div className="bg-white dark:bg-slate-800 rounded shadow-lg border p-2 opacity-90 min-w-[200px] flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0"></div>
                <span className="font-medium">{activeNode.title}</span>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded shadow-lg border p-2 opacity-90 min-w-[200px] flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${activeNode.type === 'section' ? 'bg-red-500' : 'bg-green-500'} shrink-0`}></div>
                <span className="font-medium">{activeNode.title}</span>
              </div>
            )
          )}
        </DragOverlay>
      </DndContext>
      
      {/* Диалог редактирования названия */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Редактирование названия</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Название
              </Label>
              <Input
                id="name"
                value={editNodeTitle}
                onChange={(e) => setEditNodeTitle(e.target.value)}
                className="col-span-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmEdit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              <X className="mr-2 h-4 w-4" /> Отмена
            </Button>
            <Button type="button" onClick={confirmEdit}>
              <Check className="mr-2 h-4 w-4" /> Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// Экспортируем тип для использования в других частях приложения
export type CurriculumPlanTableRef = { forceUpdate: () => void };