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

// Интерфейс для элемента при перетаскивании
interface DragItem {
  id: string;
  type: 'section' | 'group' | 'subject';
  parentId: string | null;
}

// Компонент для строки дисциплины (конечный узел дерева)
const SubjectRow: React.FC<{
  node: Subject;
  semesters: number[];
  isActive?: boolean;
  isSelected?: boolean; // Флаг для множественного выделения
  depth: number;
  rowBgClass?: string; // Класс для чередования фона строк
  isMultiSelectMode?: boolean; // Режим множественного выбора
  onValueChange: (nodeId: string, semesterIndex: number, value: number, activityType?: keyof ActivityHours) => void;
  onCreditUnitsChange: (nodeId: string, value: number) => void;
  onControlTypeChange: (nodeId: string, controlType: string, semesterIndex: number) => void;
  onSelect?: (id: string, ctrlKey: boolean, shiftKey: boolean) => void; // Обработчик выбора элемента
}> = ({ 
  node, 
  semesters, 
  isActive, 
  isSelected,
  depth, 
  rowBgClass = '',
  isMultiSelectMode,
  onValueChange, 
  onCreditUnitsChange,
  onControlTypeChange,
  onSelect
}) => {
  // Обработчик потери фокуса для пересчета значений
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, semesterIndex: number) => {
    const value = parseInt(e.target.value) || 0;
    onValueChange(node.id, semesterIndex, value);
  };
  
  // Обработчик для переименования
  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Вызовем панель переименования через родительский компонент если есть onRename
    const parent = document.querySelector(`.rename-panel[data-node-id="${node.id}"]`) as HTMLElement;
    if (parent) {
      parent.click();
    }
  };

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

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isSelected ? 'curriculum-row-selected' : (isActive ? 'bg-blue-50 dark:bg-blue-900/20' : rowBgClass)} 
        hover:bg-indigo-50/40 dark:hover:bg-indigo-600/10 transition-colors cursor-pointer`}
      onClick={(e) => onSelect && onSelect(node.id, e.ctrlKey || e.metaKey, e.shiftKey)}
    >
      {/* Ячейка с названием дисциплины */}
      <td className="sticky left-0 bg-slate-900 border-t border-slate-700/20 dark:border-slate-600/40 z-10">
        <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
          <span className="w-6"></span>
          
          <span className="cursor-grab ml-1" {...attributes} {...listeners}>
            <GripVertical size={16} className="text-slate-400 mr-2 hover:text-blue-500 transition-colors" />
          </span>
          
          <span 
            className="text-white cursor-pointer" 
            onDoubleClick={(e) => {
              e.stopPropagation(); // Предотвращаем распространение события
              // Добавим обработчик для редактирования при двойном клике
              // Если есть функция переименования в родительском компоненте, передаём ID
              const renamePanel = document.querySelector('.rename-panel') as HTMLElement;
              if (renamePanel) {
                renamePanel.click();
              }
            }}
          >
            {node.title}
          </span>
          
          <div className="ml-auto mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={(e) => e.stopPropagation()} // Предотвращаем распространение клика
                >
                  <MoreVertical size={16} className="text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  // Здесь обработчик для редактирования
                  const renamePanel = document.querySelector('.rename-panel') as HTMLElement;
                  if (renamePanel) {
                    renamePanel.click();
                  }
                }}>
                  <Edit size={16} className="mr-2" /> Переименовать
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </td>
      
      {/* Ячейка формы контроля */}
      <td className="w-32 px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
        <select
          className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 transition-colors rounded py-1"
          value={node.controlType || 'exam'}
          onChange={(e) => {
            // Для экзамена, обычно используется первый семестр по умолчанию
            const semesterIndex = 0; // Используем первый семестр по умолчанию
            onControlTypeChange(node.id, e.target.value, semesterIndex);
          }}
        >
          <option value="exam">Экзамен</option>
          <option value="credit">Зачет</option>
          <option value="differentiated_credit">Диф. зачет</option>
          <option value="coursework">Курсовая</option>
        </select>
      </td>
      
      {/* Ячейка общего количества часов (сумма) */}
      <td className="w-16 px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
        <input
          type="number"
          min={0}
          className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 tabular-nums transition-colors rounded py-1"
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          value={node.hours.reduce((sum, hours) => sum + hours, 0)}
          readOnly
        />
      </td>
      
      {/* Ячейка зачетных единиц */}
      <td className="w-16 px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
        <input
          type="number"
          min={0}
          step="0.5"
          className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 tabular-nums transition-colors rounded py-1"
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
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
            className="w-16 px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center"
          >
            <input
              type="number"
              min={0}
              className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 tabular-nums transition-colors rounded py-1"
              style={{
                WebkitAppearance: 'none', 
                appearance: 'none',
                fontWeight: activity.key === 'total' ? 'bold' : 'normal',
                backgroundColor: activity.key === 'total' ? 'rgba(100, 116, 139, 0.1)' : 'transparent'
              }}
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
  rowBgClass?: string; // Класс для чередования фона строк
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
  rowBgClass = '',
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
      className={`${isSelected ? 'curriculum-row-selected' : (isActive ? 'bg-blue-50 dark:bg-blue-900/20' : rowBgClass)} 
        hover:bg-indigo-50/40 dark:hover:bg-indigo-600/10 transition-colors cursor-pointer`}
      onClick={(e) => onSelect && onSelect(node.id, e.ctrlKey || e.metaKey, e.shiftKey)}
    >
      <td className="sticky left-0 bg-slate-900 border-t border-slate-700/20 dark:border-slate-600/40 z-10">
        <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Предотвращаем распространение клика
                onToggleCollapse(node.id);
              }}
              className="p-1 rounded-md hover:bg-slate-700 transition-colors"
            >
              {node.isCollapsed ? (
                <ChevronRight size={16} className="text-slate-300" />
              ) : (
                <ChevronDown size={16} className="text-slate-300" />
              )}
            </button>
          ) : (
            <span className="w-6"></span>
          )}
          
          <span className="cursor-grab ml-1" {...attributes} {...listeners}>
            <GripVertical size={16} className="text-slate-400 mr-2 hover:text-blue-500 transition-colors" />
          </span>
          
          <span 
            className={`flex items-center gap-1 text-white ${isSection ? 'font-semibold' : 'font-medium'} cursor-pointer`}
            onDoubleClick={(e) => {
              e.stopPropagation(); // Предотвращаем распространение события
              onRename(node.id);
            }}
          >
            {node.title}
            {hasError && !isSection && (
              <span className="ml-2 text-red-400 text-xs" title="Группа не содержит дисциплин">
                (пустая группа)
              </span>
            )}
          </span>
          
          <div className="ml-auto mr-2 flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={(e) => e.stopPropagation()} // Предотвращаем распространение клика
                >
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
      <td className="px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40"></td>
      <td className="px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40"></td>
      <td className="px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40"></td>
      
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
              className="w-16 px-3 py-2 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center font-medium tabular-nums bg-inherit"
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
export const CurriculumPlanTable = React.forwardRef<
  { forceUpdate: () => void }, 
  Props
>(function CurriculumPlanTable(props, ref) {
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
    
    // Устанавливаем флаг "грязных данных"
    if (onDirtyChange) {
      onDirtyChange(true);
    }
    
    // Запускаем таймер автосохранения
    scheduleSave();
  }, [onDirtyChange]);

  // Обработчик изменения зачетных единиц
  const handleCreditUnitsChange = useCallback((nodeId: string, value: number) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && node.type === 'subject') {
          return {
            ...node,
            creditUnits: value
          };
        }
        return node;
      });
    });
    
    // Устанавливаем флаг "грязных данных"
    if (onDirtyChange) {
      onDirtyChange(true);
    }
    
    // Запускаем таймер автосохранения
    scheduleSave();
  }, [onDirtyChange]);

  // Обработчик изменения типа контроля (экзамен, зачет и т.д.)
  const handleControlTypeChange = useCallback((
    nodeId: string, 
    controlType: string, 
    semesterIndex: number
  ) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && node.type === 'subject') {
          return {
            ...node,
            controlType,
            controlSemester: semesterIndex
          };
        }
        return node;
      });
    });
    
    // Устанавливаем флаг "грязных данных"
    if (onDirtyChange) {
      onDirtyChange(true);
    }
    
    // Запускаем таймер автосохранения
    scheduleSave();
  }, [onDirtyChange]);

  // Обработчик переименования узла
  const handleRenameNode = useCallback((nodeId: string) => {
    const node = planData.find(n => n.id === nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setEditNodeTitle(node.title);
      setShowEditDialog(true);
    }
  }, [planData]);

  // Подтверждение редактирования
  const confirmEdit = useCallback(() => {
    if (editingNodeId && editNodeTitle.trim()) {
      setPlanData(prevData => {
        return prevData.map(node => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              title: editNodeTitle.trim()
            };
          }
          return node;
        });
      });
      
      // Сбрасываем состояние редактирования
      setEditingNodeId(null);
      setEditNodeTitle('');
      setShowEditDialog(false);
      
      // Устанавливаем флаг "грязных данных"
      if (onDirtyChange) {
        onDirtyChange(true);
      }
      
      // Запускаем таймер автосохранения
      scheduleSave();
    }
  }, [editingNodeId, editNodeTitle, onDirtyChange]);

  // Обработчик начала перетаскивания
  const handleDragStart = (event: DragStartEvent) => {
    if (isDraggingOperation.current) return;
    const { id } = event.active;
    const draggedNode = planData.find(node => node.id === id);
    
    if (draggedNode) {
      setActiveId(id as string);
      setActiveNode(draggedNode);
    }
  };

  // Обработчик окончания перетаскивания
  const handleDragEnd = (event: DragEndEvent) => {
    if (isDraggingOperation.current) return;
    isDraggingOperation.current = true;
    
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeNode = active.data.current as DragItem;
      const overNode = planData.find(node => node.id === over.id);
      
      if (activeNode && overNode) {
        // Проверяем, что не перетаскиваем родителя в его потомка
        let isDescendant = false;
        let currentNode = overNode;
        
        while (currentNode && currentNode.parentId) {
          if (currentNode.parentId === activeNode.id) {
            isDescendant = true;
            break;
          }
          
          currentNode = planData.find(n => n.id === currentNode.parentId) as PlanNode;
        }
        
        if (isDescendant) {
          console.log('[CurriculumPlanTable] Cannot move a node to its own descendant');
          setActiveId(null);
          setActiveNode(null);
          isDraggingOperation.current = false;
          return;
        }
        
        // Проверяем ограничения на типы узлов
        if (
          // Нельзя перетаскивать раздел в группу или в дисциплину
          (activeNode.type === 'section' && overNode.type !== 'section') ||
          // Нельзя перетаскивать группу в дисциплину
          (activeNode.type === 'group' && overNode.type === 'subject')
        ) {
          console.log('[CurriculumPlanTable] Invalid drag operation - type mismatch');
          setActiveId(null);
          setActiveNode(null);
          isDraggingOperation.current = false;
          return;
        }
        
        // Если все проверки прошли, выполняем перемещение
        setPlanData(prevData => {
          return prevData.map(node => {
            if (node.id === active.id) {
              // Определяем новый parentId в зависимости от типа над которым бросаем
              let newParentId: string | null = null;
              
              if (overNode.type === 'section' || overNode.type === 'group') {
                // Раздел и группа могут быть родителями
                newParentId = overNode.id;
              } else if (overNode.type === 'subject') {
                // Дисциплина не может быть родителем, используем её родителя
                newParentId = overNode.parentId;
              }
              
              // Обновляем индекс сортировки
              const targetNodes = prevData.filter(n => n.parentId === newParentId);
              const overNodeIndex = targetNodes.findIndex(n => n.id === over.id);
              
              // Вставляем перед/после в зависимости от позиции
              let newOrderIndex = 0;
              if (overNodeIndex === 0) {
                newOrderIndex = (targetNodes[0]?.orderIndex || 0) - 1;
              } else if (overNodeIndex === targetNodes.length - 1) {
                newOrderIndex = (targetNodes[targetNodes.length - 1]?.orderIndex || 0) + 1;
              } else {
                // Берем среднее значение между соседними узлами
                const prevIndex = targetNodes[overNodeIndex - 1]?.orderIndex || 0;
                const nextIndex = targetNodes[overNodeIndex]?.orderIndex || 0;
                newOrderIndex = prevIndex + (nextIndex - prevIndex) / 2;
              }
              
              return {
                ...node,
                parentId: newParentId,
                orderIndex: newOrderIndex
              };
            }
            return node;
          });
        });
        
        // Устанавливаем флаг "грязных данных"
        if (onDirtyChange) {
          onDirtyChange(true);
        }
        
        // Запускаем таймер автосохранения
        scheduleSave();
      }
    }
    
    setActiveId(null);
    setActiveNode(null);
    setTimeout(() => {
      isDraggingOperation.current = false;
    }, 100);
  };

  // Функция для свертывания/развертывания узла
  const toggleNodeCollapse = useCallback((nodeId: string) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            isCollapsed: !node.isCollapsed
          };
        }
        return node;
      });
    });
  }, []);
  
  // Функция для получения видимых узлов (с учетом свернутых разделов)
  function getVisibleNodes(): PlanNode[] {
    const result: PlanNode[] = [];
    const hiddenParents = new Set<string>();
    
    // Функция для рекурсивного построения плоского списка
    function buildList(parentId: string | null = null, depth = 0) {
      // Находим прямых потомков текущего родителя
      const children = planData
        .filter(node => node.parentId === parentId)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      
      // Обрабатываем каждого потомка
      for (const node of children) {
        // Если родитель скрыт, пропускаем
        if (parentId !== null && hiddenParents.has(parentId)) {
          continue;
        }
        
        // Добавляем узел с глубиной вложенности
        const nodeWithDepth = { ...node, depth } as PlanNode;
        result.push(nodeWithDepth);
        
        // Если узел свернут, добавляем в список скрытых родителей
        if (node.isCollapsed) {
          hiddenParents.add(node.id);
        }
        
        // Рекурсивно обрабатываем потомков текущего узла
        if (node.type !== 'subject') {
          buildList(node.id, depth + 1);
        }
      }
    }
    
    // Начинаем с корневых узлов
    buildList(null);
    
    return result;
  }

  // Общая функция для выбора узла (одинарного и множественного)
  const selectNode = useCallback((id: string, ctrlKey = false, shiftKey = false) => {
    console.log(`Selecting node ${id}, ctrlKey: ${ctrlKey}, shiftKey: ${shiftKey}`);
    
    // Если зажат Ctrl/Cmd
    if (ctrlKey) {
      // Включаем режим множественного выбора, если он еще не включен
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true);
      }
      
      setSelectedNodes(prev => {
        const newSelection = new Set(prev);
        
        // Если узел уже выбран, убираем его из выделения
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else {
          // Иначе добавляем
          newSelection.add(id);
        }
        
        if (newSelection.size === 0) {
          // Если выделение пусто, отключаем режим множественного выбора
          setIsMultiSelectMode(false);
          setSelectedNodeId(null);
        } else {
          // Запоминаем последний выбранный элемент для Shift
          lastSelectedNodeRef.current = id;
          setSelectedNodeId(id); // Устанавливаем текущий выбранный узел
        }
        
        return newSelection;
      });
    } 
    // Если зажат Shift и установлен последний выбранный элемент
    else if (shiftKey && lastSelectedNodeRef.current) {
      // Включаем режим множественного выбора, если он еще не включен
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true);
      }
      
      // Находим индексы начального и конечного элементов
      const lastSelectedIndex = visibleNodes.findIndex(n => n.id === lastSelectedNodeRef.current);
      const currentIndex = visibleNodes.findIndex(n => n.id === id);
      
      // Если оба элемента найдены
      if (lastSelectedIndex !== -1 && currentIndex !== -1) {
        // Определяем диапазон выделения
        const start = Math.min(lastSelectedIndex, currentIndex);
        const end = Math.max(lastSelectedIndex, currentIndex);
        
        console.log(`Selecting range from ${start} to ${end}`);
        
        // Создаем новое выделение
        const nodesToSelect = visibleNodes.slice(start, end + 1).map(n => n.id);
        setSelectedNodes(new Set(nodesToSelect));
        setSelectedNodeId(id); // Устанавливаем текущий выбранный узел
      }
    }
    // Обычный выбор элемента
    else {
      // Снимаем множественное выделение
      if (isMultiSelectMode) {
        clearSelection();
      }
      
      // Простое выделение одного элемента
      setSelectedNodeId(id);
      setSelectedNodes(new Set([id])); // Также добавляем в множественное выделение
      lastSelectedNodeRef.current = id;
    }
  }, [isMultiSelectMode, clearSelection, visibleNodes]);

  // Функция для планирования сохранения (debounce)
  const scheduleSave = useCallback(() => {
    lastChangeTime.current = Date.now();
    
    // Очищаем предыдущий таймер, если он был
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер для сохранения
    saveTimeoutRef.current = window.setTimeout(() => {
      // Проверяем, что прошло достаточно времени с последнего изменения
      if (Date.now() - lastChangeTime.current >= 3000) {
        if (onPlanChange) {
          console.log('[CurriculumPlanTable] Autosaving data...');
          onPlanChange(planData);
        }
      }
    }, 3000);
  }, [planData, onPlanChange]);

  // Вычисляем видимые узлы для рендеринга
  const visibleNodes = useMemo(() => {
    return getVisibleNodes();
  }, [getVisibleNodes]);

  // Проверка на наличие пустых групп
  useEffect(() => {
    // Находим все группы (не разделы и не дисциплины)
    const groups = planData.filter(node => node.type === 'group');
    
    // Проверяем каждую группу на наличие дочерних элементов
    const emptyGroups = groups.filter(group => {
      return !planData.some(node => node.parentId === group.id);
    });
    
    // Обновляем список проблемных узлов
    setNodesWithErrors(emptyGroups.map(group => group.id));
  }, [planData]);

  // Обеспечиваем доступ к методу обновления извне через ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref({ forceUpdate: () => { /* Для принудительного обновления компонента */ } });
      } else {
        ref.current = { 
          forceUpdate: () => { /* Для принудительного обновления компонента */ }
        };
      }
    }
  }, [ref]);

  // Если данные изменились извне, обновляем состояние
  useEffect(() => {
    if (initialData?.planData) {
      setPlanData(initialData.planData);
    }
  }, [initialData]);

  // Чистим память при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Обработчик удаления выбранных строк
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodes.size > 0) {
      // Преобразуем Set в массив для удаления
      const nodesToDelete = Array.from(selectedNodes);
      // Удаляем каждый узел
      nodesToDelete.forEach(nodeId => {
        handleDeleteNode(nodeId);
      });
      // Очищаем выделение
      setSelectedNodes(new Set());
    }
  }, [selectedNodes, handleDeleteNode]);
  
  // Обработчик нажатия клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Проверяем, активен ли документ и не в режиме ввода
      if (document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA' && 
          document.activeElement?.tagName !== 'SELECT') {
        // Реагируем на Delete или Backspace для удаления выбранных строк
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.size > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodes, handleDeleteSelected]);

  // Рендеринг главного содержимого
  return (
    <div className="py-4">
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => addNode('section')}
          >
            <PlusCircle size={16} />
            <span>Добавить раздел</span>
          </Button>
          
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDeleteSelected}
            disabled={selectedNodes.size === 0}
          >
            <Trash size={16} />
            <span>Удалить выбранные</span>
          </Button>
        </div>
        
        {isMultiSelectMode && selectedNodes.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              Выбрано элементов: {selectedNodes.size}
            </span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                if (selectedNodes.size > 0) {
                  // Удаляем первый элемент из выбранных (остальные удалятся автоматически)
                  const firstNode = Array.from(selectedNodes)[0];
                  handleDeleteNode(firstNode);
                }
              }}
            >
              <Trash size={16} className="mr-2" />
              Удалить выбранное
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => clearSelection()}
            >
              <X size={16} className="mr-2" />
              Отменить выбор
            </Button>
          </div>
        )}
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="relative bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[80vh]">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 z-20">
                {/* Первый уровень заголовка: Дисциплины и курсы */}
                <tr className="bg-slate-800 text-white border-b-2 border-slate-500">
                  <th className="sticky left-0 top-0 bg-slate-900 px-3 py-2 z-30 min-w-[300px] text-left">
                    Дисциплины
                  </th>
                  <th className="px-3 py-2 border-r border-slate-600">Форма контроля</th>
                  <th className="px-3 py-2 border-r border-slate-600">Всего часов</th>
                  <th className="px-3 py-2 border-r border-slate-600">Зачетные единицы</th>
                  {Array.from({ length: courses }, (_, i) => i + 1).map(course => (
                    <th key={`course-${course}`} colSpan={7 * 2} className="text-center px-3 py-2">
                      <div className="font-bold text-lg">{course} курс</div>
                    </th>
                  ))}
                  {extraMonths > 0 && (
                    <th colSpan={7} className="text-center px-3 py-2">
                      <div className="font-bold text-lg">Доп. семестр</div>
                    </th>
                  )}
                </tr>
                
                {/* Второй уровень заголовка: Семестры */}
                <tr className="bg-slate-700 text-white border-b-2 border-slate-600">
                  <th className="sticky left-0 top-[41px] bg-slate-900 px-3 py-2 z-30"></th>
                  <th className="px-3 py-2 border-r border-slate-600"></th>
                  <th className="px-3 py-2 border-r border-slate-600"></th>
                  <th className="px-3 py-2 border-r border-slate-600"></th>
                  {Array.from({ length: semesters.length }, (_, i) => i + 1).map(semester => (
                    <th key={`semester-${semester}`} colSpan={7} className="text-center px-3 py-2 font-medium">
                      {semester} семестр
                    </th>
                  ))}
                </tr>
                
                {/* Третий уровень заголовка: Типы занятий */}
                <tr className="bg-slate-600 text-white border-b-2 border-slate-500">
                  <th className="sticky left-0 top-[81px] bg-slate-900 px-3 py-2 z-30"></th>
                  <th className="px-3 py-2 border-r border-slate-600"></th>
                  <th className="px-3 py-2 border-r border-slate-600"></th>
                  <th className="px-3 py-2 border-r border-slate-600"></th>
                  
                  {/* Для каждого семестра выводим заголовки типов занятий */}
                  {semesters.map(semester => {
                    const headers = [
                      { key: 'lectures', label: 'Лек' },
                      { key: 'practice', label: 'Пр' },
                      { key: 'laboratory', label: 'Лаб' },
                      { key: 'selfStudy', label: 'СП' },
                      { key: 'courseProject', label: 'КРП' },
                      { key: 'consultation', label: 'Конс' },
                      { key: 'total', label: 'Итого' }
                    ];
                    
                    return headers.map(header => (
                      <th
                        key={`sem-${semester}-${header.key}`}
                        className="px-3 py-2 text-center border-l border-white/20 font-medium"
                        title={getFullHeaderTitle(header.key)}
                      >
                        {header.label}
                      </th>
                    ));
                  })}
                </tr>
              </thead>
              
              <tbody>
                {/* Сортируемый контекст для перетаскивания */}
                <SortableContext items={visibleNodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                  {visibleNodes.map((node, index) => {
                    // Определяем цвет фона для чередования строк
                    // Используем индекс исходного массива, который включает все видимые строки
                    const rowBgClass = index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900/30';
                    
                    if (node.type === 'subject') {
                      return (
                        <SubjectRow
                          key={node.id}
                          node={node as Subject}
                          semesters={semesters}
                          isActive={selectedNodeId === node.id}
                          isSelected={selectedNodes.has(node.id)}
                          isMultiSelectMode={isMultiSelectMode}
                          depth={node.depth || 0}
                          rowBgClass={rowBgClass}
                          onValueChange={handleValueChange}
                          onCreditUnitsChange={handleCreditUnitsChange}
                          onControlTypeChange={handleControlTypeChange}
                          onSelect={selectNode}
                        />
                      );
                    } else {
                      const isSection = node.type === 'section';
                      const hasChildren = planData.some(n => n.parentId === node.id);
                      const hasError = nodesWithErrors.includes(node.id);
                      
                      return (
                        <GroupRow
                          key={node.id}
                          node={node as NodeWithSums}
                          semesters={semesters}
                          isActive={selectedNodeId === node.id}
                          isSelected={selectedNodes.has(node.id)}
                          isMultiSelectMode={isMultiSelectMode}
                          hasChildren={hasChildren}
                          isSection={isSection}
                          hasError={hasError}
                          depth={node.depth || 0}
                          rowBgClass={rowBgClass}
                          onToggleCollapse={toggleNodeCollapse}
                          onAddChild={addNode}
                          onRename={handleRenameNode}
                          onDelete={handleDeleteNode}
                          onSelect={selectNode}
                        />
                      );
                    }
                  })}
                </SortableContext>
              </tbody>
              
              {/* Блок с итогами и суммарными часами */}
              <tfoot className="bg-slate-200 dark:bg-slate-800 sticky bottom-0 border-t-2 border-slate-400 z-20">
                <tr>
                  <td className="sticky left-0 bottom-0 bg-slate-200 dark:bg-slate-800 px-3 py-2 font-bold z-20">
                    Итого по учебному плану
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 font-bold text-center">
                    {planData
                      .filter(node => node.type === 'subject')
                      .reduce((sum, subject) => sum + (subject as Subject).hours.reduce((s, h) => s + h, 0), 0)}
                  </td>
                  <td className="px-3 py-2 font-bold text-center">
                    {planData
                      .filter(node => node.type === 'subject')
                      .reduce((sum, subject) => sum + ((subject as Subject).creditUnits || 0), 0)}
                  </td>
                  
                  {/* Для каждого семестра и типа активности выводим общую сумму */}
                  {semesters.map((_, semIndex) => {
                    // Получаем все предметы
                    const subjects = planData.filter(node => node.type === 'subject') as Subject[];
                    
                    const activityTypes = [
                      { key: 'lectures', label: 'Лек' },
                      { key: 'practice', label: 'Пр' },
                      { key: 'laboratory', label: 'Лаб' },
                      { key: 'selfStudy', label: 'СП' },
                      { key: 'courseProject', label: 'КРП' },
                      { key: 'consultation', label: 'Конс' },
                      { key: 'total', label: 'Итого' }
                    ];
                    
                    return activityTypes.map((act, actIndex) => {
                      // Считаем сумму часов по всем предметам для текущего семестра и типа активности
                      const sum = subjects.reduce((total, subject) => {
                        if (!subject.activityHours || !subject.activityHours[semIndex]) {
                          return total;
                        }
                        
                        let value = 0;
                        if (act.key === 'total') value = subject.hours[semIndex] || 0;
                        else if (act.key === 'lectures') value = subject.activityHours[semIndex].lectures || 0;
                        else if (act.key === 'laboratory') value = subject.activityHours[semIndex].laboratory || 0;
                        else if (act.key === 'practice') value = subject.activityHours[semIndex].practice || 0;
                        else if (act.key === 'selfStudy') value = subject.activityHours[semIndex].selfStudy || 0;
                        else if (act.key === 'courseProject') value = subject.activityHours[semIndex].courseProject || 0;
                        else if (act.key === 'consultation') value = subject.activityHours[semIndex].consultation || 0;
                        
                        return total + value;
                      }, 0);
                    
                      return (
                        <td 
                          key={`total-sem-${semIndex}-act-${actIndex}`}
                          className="px-3 py-2 text-center border-l border-white/20 font-semibold text-sm"
                        >
                          {sum > 0 ? sum : ''}
                        </td>
                      );
                    });
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
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

// Вспомогательная функция для получения полного названия типа занятия
function getFullHeaderTitle(key: string): string {
  switch(key) {
    case 'lectures': return 'Лекции';
    case 'practice': return 'Практические занятия';
    case 'laboratory': return 'Лабораторные работы';
    case 'selfStudy': return 'Самостоятельная работа';
    case 'courseProject': return 'Курсовой проект/работа';
    case 'consultation': return 'Консультации';
    case 'total': return 'Итого часов';
    default: return '';
  }
}

// Экспортируем тип для использования в других частях приложения
export type CurriculumPlanTableRef = { forceUpdate: () => void };