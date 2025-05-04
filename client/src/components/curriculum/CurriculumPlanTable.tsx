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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreVertical, ChevronRight, ChevronDown, Trash, Edit, Plus, GripVertical } from 'lucide-react';
import { PlanNode, Subject, CurriculumPlan } from '@/types/curriculum';
import sampleData from '@/data/sampleCurrPlan.json';

// Тип для параметров компонента
interface Props {
  courses: number;
  extraMonths: number;
  initialData?: any;
  onPlanChange?: (planData: CurriculumPlan) => void;
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
  depth: number;
  onValueChange: (id: string, semesterIndex: number, value: number) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ node, semesters, isActive, depth, onValueChange, onRename, onDelete }) => {
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

  // Обработчик изменения часов в ячейке
  const handleHoursChange = (semesterIndex: number, value: string) => {
    const intValue = parseInt(value) || 0;
    onValueChange(node.id, semesterIndex, intValue);
  };

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
      className={`${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''} hover:bg-indigo-50/40 dark:hover:bg-indigo-600/10 transition-colors`}
    >
      <td className="sticky left-0 bg-inherit border-t border-slate-700/20 dark:border-slate-600/40 z-10">
        <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
          <span className="cursor-grab" {...attributes} {...listeners}>
            <GripVertical size={16} className="text-slate-400 mr-2 hover:text-blue-500 transition-colors" />
          </span>
          <span className="font-normal text-blue-700 dark:text-blue-300">{node.title}</span>
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
      {semesters.map((s, index) => (
        <td key={s} className="w-16 p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center">
          <input
            type="number"
            min={0}
            className="w-full bg-transparent text-center outline-none hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-100 dark:focus:bg-blue-900/40 tabular-nums transition-colors rounded py-1"
            value={node.hours[index] ?? 0}
            onChange={(e) => handleHoursChange(index, e.target.value)}
            onBlur={(e) => handleBlur(e, index)}
          />
        </td>
      ))}
    </tr>
  );
};

// Компонент строки для разделов и групп (не конечные узлы)
const GroupRow: React.FC<{
  node: NodeWithSums;
  semesters: number[];
  isActive?: boolean;
  hasChildren: boolean;
  isSection: boolean;
  depth: number;
  onToggleCollapse: (id: string) => void;
  onAddChild: (parentId: string, type: 'section' | 'group' | 'subject') => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ 
  node, 
  semesters, 
  isActive, 
  hasChildren, 
  isSection, 
  depth, 
  onToggleCollapse, 
  onAddChild, 
  onRename, 
  onDelete 
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

  // Стиль для фона в зависимости от типа узла
  const bgClass = isSection ? 
    'bg-slate-100 dark:bg-slate-800' : 
    'bg-emerald-50 dark:bg-emerald-900/20';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : bgClass} hover:bg-indigo-50/40 dark:hover:bg-indigo-600/10 transition-colors`}
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
          
          <span className={`${isSection ? 'font-semibold text-red-700 dark:text-red-400' : 'font-medium text-green-700 dark:text-green-400'}`}>
            {node.title}
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
      {semesters.map((s, index) => (
        <td 
          key={s} 
          className={`w-16 p-1 border-l border-t border-slate-700/20 dark:border-slate-600/40 text-center font-medium tabular-nums ${
            isSection ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-green-50/50 dark:bg-green-950/20'
          }`}
        >
          <span className={`${
            node.sums && node.sums[index] > 0 ? (isSection ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400') : 'text-slate-400 dark:text-slate-600'
          }`}>
            {node.sums?.[index] || 0}
          </span>
        </td>
      ))}
    </tr>
  );
};

// Главный компонент таблицы учебного плана
export function CurriculumPlanTable({ courses, extraMonths, initialData, onPlanChange }: Props) {
  // Состояние для времени последнего изменения (для debounce)
  const lastChangeTime = useRef<number>(0);
  // Идентификатор таймера автосохранения
  const saveTimeoutRef = useRef<number | null>(null);
  
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
  
  // Состояние для узла, который перетаскивается (drag & drop)
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<PlanNode | null>(null);

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
    setPlanData(prevData => {
      // Находим максимальный orderIndex для новых элементов с тем же родителем
      const siblingNodes = prevData.filter(node => node.parentId === parentId);
      const maxOrderIndex = siblingNodes.length > 0
        ? Math.max(...siblingNodes.map(node => node.orderIndex || 0))
        : -1;
      
      // Создаем новый узел
      const newNode = createNewNode(type, parentId, maxOrderIndex + 1);
      
      // Добавляем его в план
      return [...prevData, newNode];
    });
  }, [createNewNode]);

  // Обработчик удаления узла (и всех его потомков)
  const handleDeleteNode = useCallback((nodeId: string) => {
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
  }, []);

  // Обработчик изменения значения часов для дисциплины
  const handleValueChange = useCallback((nodeId: string, semesterIndex: number, value: number) => {
    setPlanData(prevData => {
      return prevData.map(node => {
        if (node.id === nodeId && node.type === 'subject') {
          // Создаем новый массив часов с обновленным значением
          const newHours = [...(node as Subject).hours];
          newHours[semesterIndex] = value;
          
          // Возвращаем обновленный узел
          return {
            ...node,
            hours: newHours
          } as Subject;
        }
        return node;
      });
    });
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

  // Обработчик переименования узла (заглушка, нужно реализовать диалог)
  const handleRename = useCallback((nodeId: string) => {
    // TODO: Добавить модальное окно для переименования
    const newName = prompt('Введите новое название:');
    
    if (newName !== null && newName.trim() !== '') {
      setPlanData(prevData => {
        return prevData.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              title: newName.trim()
            };
          }
          return node;
        });
      });
    }
  }, []);

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
          setPlanData(prevData => {
            // Находим оригинальный индекс активного узла
            const activeIndex = prevData.findIndex(n => n.id === active.id);
            
            // Находим индекс узла "над" которым мы перетаскиваем
            const overIndex = prevData.findIndex(n => n.id === over.id);
            
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
            
            // Не вызываем onPlanChange напрямую, т.к. это вызовет эффект выше
            // Он сам обнаружит изменения и вызовет сохранение
            return newItems;
          });
        }
      }
    }
    
    // Сбрасываем состояние перетаскивания
    setActiveId(null);
    setActiveNode(null);
  };

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
  
  // Функция для сравнения предыдущих и текущих данных
  const hasPlanDataChanged = useCallback(() => {
    if (!previousPlanDataRef.current) return false;
    
    // Сравниваем только по существенным свойствам:
    // - структура дерева (id, parentId, type)
    // - orderIndex для порядка элементов
    // - hours для предметов
    
    if (previousPlanDataRef.current.length !== planData.length) return true;
    
    for (let i = 0; i < planData.length; i++) {
      const current = planData[i];
      const prev = previousPlanDataRef.current.find(item => item.id === current.id);
      
      if (!prev) return true; // Новый элемент
      
      if (
        prev.parentId !== current.parentId ||
        prev.type !== current.type ||
        prev.orderIndex !== current.orderIndex ||
        (prev.type === 'subject' && 
          JSON.stringify((prev as Subject).hours) !== 
          JSON.stringify((current as Subject).hours)
        )
      ) {
        return true;
      }
    }
    
    return false;
  }, [planData]);
  
  // Отложенное сохранение при изменении данных
  useEffect(() => {
    // Пропускаем эффект при первом рендере
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousPlanDataRef.current = planData;
      return;
    }
    
    // Проверяем, действительно ли данные изменились
    if (onPlanChange && hasPlanDataChanged()) {
      console.log("[CurriculumPlanTable] Detected real changes in plan data, scheduling save...");
      
      // Отменяем предыдущий таймер, если он есть
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      
      // Запоминаем время последнего изменения
      lastChangeTime.current = Date.now();
      
      // Устанавливаем новый таймер для сохранения через 1000 мс (увеличиваем время)
      saveTimeoutRef.current = window.setTimeout(() => {
        console.log("[CurriculumPlanTable] Saving plan data...");
        onPlanChange(planData);
        saveTimeoutRef.current = null;
      }, 1000);
      
      // Обновляем предыдущее состояние
      previousPlanDataRef.current = planData;
    }
    
    // Отменяем таймер при размонтировании компонента
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [planData, onPlanChange, hasPlanDataChanged]);

  // Сортированные ID для SortableContext
  const sortedIds = useMemo(() => {
    return flattenedData.map(node => node.id);
  }, [flattenedData]);

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[]}
      >
        <div className="overflow-auto border rounded-lg curr-plan plan-wrapper max-h-[70vh]">
          <table className="w-full table-fixed border-collapse select-none text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="sticky left-0 top-0 bg-slate-800 p-2 z-30 w-[280px] text-left">Дисциплины</th>
                {semesters.map(s => (
                  <th 
                    key={s} 
                    className="sticky top-0 z-20 w-16 px-2 py-1 text-center border-l border-slate-700/20 dark:border-slate-600/40 font-semibold text-xs"
                  >
                    {s}
                  </th>
                ))}
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
                        depth={node.depth || 0}
                        onValueChange={handleValueChange}
                        onRename={handleRename}
                        onDelete={handleDeleteNode}
                      />
                    );
                  } else {
                    return (
                      <GroupRow
                        key={node.id}
                        node={node}
                        semesters={semesters}
                        isActive={node.id === selectedNodeId}
                        hasChildren={hasChildren}
                        isSection={node.type === 'section'}
                        depth={node.depth || 0}
                        onToggleCollapse={handleToggleCollapse}
                        onAddChild={(parentId, type) => handleAddNode(type, parentId)}
                        onRename={handleRename}
                        onDelete={handleDeleteNode}
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
      
      {/* Кнопка добавления нового элемента */}
      <div className="flex justify-end">
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
                onClick={() => addNode('section')}
              >
                <Plus size={16} /> Раздел
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start gap-2 rounded-none"
                onClick={() => addNode('group')}
              >
                <Plus size={16} /> Группа дисциплин
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start gap-2 rounded-none"
                onClick={() => addNode('subject')}
              >
                <Plus size={16} /> Дисциплина
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}