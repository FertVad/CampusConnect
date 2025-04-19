import React, { useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Тип активности
// Может быть одиночным символом или строкой символов (для комбинации активностей по дням)
export type ActivityType = "У" | "К" | "П" | "Э" | "Д" | "" | string;

// Типы активностей с описаниями
export const ACTIVITY_TYPES: { [key in Exclude<ActivityType, "">]: string } = {
  "У": "Учебный процесс",
  "К": "Каникулы",
  "П": "Практика",
  "Э": "Экзаменационная сессия",
  "Д": "Дипломное проектирование"
};

// Цвета для активностей (пастельные оттенки)
export const ACTIVITY_COLORS: { [key in Exclude<ActivityType, "">]: { bg: string, text: string, hoverBg: string } } = {
  "У": { bg: "bg-blue-100", text: "text-blue-800", hoverBg: "hover:bg-blue-200" },
  "К": { bg: "bg-gray-100", text: "text-gray-800", hoverBg: "hover:bg-gray-200" },
  "П": { bg: "bg-yellow-100", text: "text-yellow-800", hoverBg: "hover:bg-yellow-200" },
  "Э": { bg: "bg-red-100", text: "text-red-800", hoverBg: "hover:bg-red-200" },
  "Д": { bg: "bg-purple-100", text: "text-purple-800", hoverBg: "hover:bg-purple-200" },
};

// Интерфейс для дня недели
interface WeekDay {
  name: string;     // Пн, Вт, и т.д.
  date: number;     // Число месяца
  selected: boolean;
  activity: ActivityType;
}

export interface WeekInfo {
  courseId: number;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  monthName: string;
}

interface WeekActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekInfo: WeekInfo | null;
  currentActivity: ActivityType;
  onActivityChange: (activity: ActivityType) => void;
}

export function WeekActivityDialog({
  open,
  onOpenChange,
  weekInfo,
  currentActivity,
  onActivityChange
}: WeekActivityDialogProps) {
  // Не используем раннее возвращение null, так как это вызывает проблемы с состоянием
  // вместо этого используем условный рендеринг в JSX

  // Дни недели с числами календаря
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  // Выбранная активность
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>(currentActivity || "");
  // Отслеживаем клики для определения двойного клика
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  // Отслеживаем, есть ли выбранные дни
  const [hasSelectedDays, setHasSelectedDays] = useState<boolean>(false);

  // Инициализируем дни недели при открытии модального окна
  useLayoutEffect(() => {
    if (weekInfo) {
      // Создаем неделю, начиная с понедельника
      const { startDate } = weekInfo;
      const weekStart = new Date(startDate);
      
      // Расчитываем дату понедельника для этой недели
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // корректируем для воскресенья
      weekStart.setDate(diff);

      const days: WeekDay[] = [];
      const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

      // Разбиваем текущую активность на символы для определения активности по дням
      // Например, если currentActivity === "УУУККПЭ", то:
      // Пн-Ср: "У", Чт-Пт: "К", Сб: "П", Вс: "Э"
      let dailyActivities: ActivityType[] = [];
      
      // Инициализируем массив пустыми значениями
      dailyActivities = Array(7).fill('') as ActivityType[];
      
      // Определяем активности по дням
      if (currentActivity) {
        if (currentActivity.length === 1) {
          // Если активность установлена и это один символ - применяем его ко всем дням
          dailyActivities = Array(7).fill(currentActivity) as ActivityType[];
        } else {
          // Если активность - строка символов, распределяем их по дням
          // Если символов меньше 7, оставшиеся дни будут пустыми
          // Если символов больше 7, используем только первые 7
          const chars = currentActivity.split('');
          for (let i = 0; i < Math.min(chars.length, 7); i++) {
            if (chars[i] && chars[i].trim() !== '') {
              dailyActivities[i] = chars[i] as ActivityType;
            }
          }
        }
      }

      // Создаем дни недели с календарными датами и активностями
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        days.push({
          name: daysOfWeek[i],
          date: date.getDate(),
          // При открытии диалога дни НЕ выбраны, в отличие от предыдущей реализации
          selected: false,
          // Устанавливаем активность из разобранной строки или пустую
          activity: dailyActivities[i] || ""
        });
      }

      setWeekDays(days);
      
      // Определяем преобладающую активность для выбора в RadioGroup
      const activityCounts = new Map<ActivityType, number>();
      days.forEach(day => {
        if (day.activity) {
          activityCounts.set(day.activity, (activityCounts.get(day.activity) || 0) + 1);
        }
      });
      
      // Находим активность с максимальным количеством дней
      let predominantActivity: ActivityType = "";
      let maxCount = 0;
      
      activityCounts.forEach((count, activity) => {
        if (count > maxCount) {
          maxCount = count;
          predominantActivity = activity;
        }
      });
      
      // Устанавливаем преобладающую активность как выбранную
      setSelectedActivity(predominantActivity);
      // При открытии диалога дни не выбраны
      setHasSelectedDays(false);
    }
  }, [weekInfo, currentActivity]);
  
  // Удаляем обработчик клика вне области - используем только двойной клик
  // для сброса выделения
  const handleContainerClick = (e: React.MouseEvent) => {
    // Оставляем пустую функцию, чтобы не было ошибок
    // Сброс делаем только по двойному клику
  };

  // Обработчик клика по дню недели
  const handleDayClick = (index: number) => {
    const now = Date.now();
    const timeDiff = now - lastClickTime;
    
    if (timeDiff < 300) { // Двойной клик (300мс)
      // Выбираем или снимаем выбор со всех рабочих дней (Пн-Пт)
      const newDays = [...weekDays];
      
      // Проверяем, все ли рабочие дни выбраны
      const allWorkdaysSelected = newDays.slice(0, 5).every(day => day.selected);
      
      // Если все рабочие дни выбраны, снимаем выбор, иначе выбираем все
      for (let i = 0; i < 5; i++) { // Пн-Пт (индексы 0-4)
        newDays[i].selected = !allWorkdaysSelected;
      }
      
      setWeekDays(newDays);
      setHasSelectedDays(newDays.some(day => day.selected));
    } else {
      // Одинарный клик - инвертируем выбор дня
      const newDays = [...weekDays];
      
      // Если день уже выбран, снимаем выбор
      if (newDays[index].selected) {
        newDays[index].selected = false;
      } else {
        // Если день не выбран, выбираем его
        newDays[index].selected = true;
        
        // Если выбрана активность, сразу же применяем её к выбранному дню
        if (selectedActivity) {
          newDays[index].activity = selectedActivity;
        }
      }
      
      setWeekDays(newDays);
      setHasSelectedDays(newDays.some(day => day.selected));
    }
    
    setLastClickTime(now);
  };

  // Обработчик выбора активности
  const handleActivitySelect = (value: string) => {
    const activityValue = value as ActivityType;
    setSelectedActivity(activityValue);
    
    // Если есть выбранные дни, сразу применяем к ним выбранную активность
    if (hasSelectedDays) {
      const updatedDays = weekDays.map(day => ({
        ...day,
        // Если день выбран, устанавливаем новую активность
        activity: day.selected ? activityValue : day.activity
      }));
      setWeekDays(updatedDays);
    }
  };

  // Стиль для дня недели в зависимости от активности и выбранности
  const getDayStyle = (day: WeekDay) => {
    let baseStyle = "";
    
    // Установка базового стиля для дня
    if (!day.activity && !day.selected) {
      // Если нет активности и день не выбран - стандартный фон
      baseStyle = "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white";
    } else if (day.selected) {
      // Если день выбран - показываем прозрачным цветом активности или предварительный выбор
      if (selectedActivity && selectedActivity in ACTIVITY_COLORS) {
        // Используем цвет выбранной активности для предпросмотра
        const previewColorStyle = ACTIVITY_COLORS[selectedActivity as Exclude<ActivityType, "">];
        baseStyle = `${previewColorStyle.bg} text-slate-800 ring-2 ring-blue-600 dark:ring-blue-400`;
      } else {
        // Если активность не выбрана, но день выделен
        baseStyle = "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white ring-2 ring-blue-600 dark:ring-blue-400";
      }
    } else if (day.activity && day.activity in ACTIVITY_COLORS) {
      // Если у дня есть активность и он не выбран
      const colorStyle = ACTIVITY_COLORS[day.activity as Exclude<ActivityType, "">];
      baseStyle = `${colorStyle.bg} text-slate-800`;
    } else if (day.activity) {
      // Если у дня активность не из предопределенных - используем нейтральный цвет
      baseStyle = "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white";
    }
    
    return baseStyle;
  };

  // Обработчик сохранения
  const handleSave = () => {
    // Собираем активности для всех дней недели
    // и передаем их в виде строки символов
    
    // Если есть выбранные дни, сначала применяем к ним текущую активность
    if (hasSelectedDays && selectedActivity) {
      const updatedDays = weekDays.map(day => ({
        ...day,
        activity: day.selected ? selectedActivity : day.activity,
        selected: false
      }));
      setWeekDays(updatedDays);
    }
    
    // Собираем активности каждого дня в строку из 7 символов
    // для передачи наверх и сохранения
    // Например: "УУУККПЭ" - где каждый символ соответствует дню недели
    
    const activitiesString = weekDays.map(day => day.activity || '').join('');
    
    // Проверяем, что у нас есть хотя бы одна активность в неделе
    const hasAnyActivity = activitiesString.trim() !== '';
    
    if (hasAnyActivity) {
      // Если в строке есть хотя бы один символ, передаем эту строку
      onActivityChange(activitiesString as ActivityType);
    } else {
      // Если нет ни одной активности, передаем пустую строку
      onActivityChange('');
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && weekInfo && (
        <DialogContent 
          key={`dialog-week-${weekInfo.courseId}-${weekInfo.weekNumber}`}
          className="sm:max-w-md calendar-dialog-content"
        >
          <DialogHeader>
            <DialogTitle>Активность для недели {weekInfo.weekNumber}</DialogTitle>
            <DialogDescription>
              {weekInfo.monthName}, курс {weekInfo.courseId}
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-4" onClick={handleContainerClick}>
          <div 
            className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700"
            onDoubleClick={(e) => {
              // Обработка двойного клика по всей области
              e.preventDefault(); // Предотвращаем выделение текста
              
              // Проверяем наличие выбранных дней
              const hasSelected = weekDays.some(day => day.selected);
              
              if (hasSelected) {
                // Если есть выбранные дни - сбрасываем все выделения
                const updatedDays = weekDays.map(day => ({
                  ...day,
                  selected: false
                }));
                setWeekDays(updatedDays);
                setHasSelectedDays(false);
              } else {
                // Если выделенных дней нет - проверяем состояние рабочих дней
                const newDays = [...weekDays];
                
                // Проверяем, все ли рабочие дни (Пн-Пт) имеют одинаковую активность
                const workdays = newDays.slice(0, 5);
                const firstActivity = workdays[0].activity;
                const allHaveSameActivity = firstActivity && 
                  workdays.every(day => day.activity === firstActivity);
                
                // Если все рабочие дни имеют одинаковую непустую активность,
                // то при двойном клике очищаем их активность
                if (allHaveSameActivity) {
                  for (let i = 0; i < 5; i++) { // Пн-Пт (индексы 0-4)
                    newDays[i].selected = true;
                    newDays[i].activity = ""; // Очищаем активность
                  }
                } else {
                  // Иначе выбираем все рабочие дни и устанавливаем им текущую активность
                  for (let i = 0; i < 5; i++) { // Пн-Пт (индексы 0-4)
                    newDays[i].selected = true;
                    
                    // Если выбрана активность, применяем её
                    if (selectedActivity) {
                      newDays[i].activity = selectedActivity;
                    }
                  }
                }
                
                setWeekDays(newDays);
                setHasSelectedDays(true);
              }
            }}
          >
            <div className="grid grid-cols-7 gap-2 week-days-grid">
              {weekDays.map((day, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer transition-all ${getDayStyle(day)}`}
                  onClick={(e) => {
                    e.stopPropagation(); // Останавливаем всплытие события
                    handleDayClick(i);
                  }}
                >
                  <div className="text-xs font-semibold">{day.name}</div>
                  <div className="text-sm font-bold">{day.date}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium mb-1">Выберите тип активности:</h4>
            <RadioGroup 
              value={selectedActivity} 
              onValueChange={handleActivitySelect}
              className="grid grid-cols-1 gap-2"
            >
              {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
                const colorStyle = ACTIVITY_COLORS[code as Exclude<ActivityType, "">];
                return (
                  <div 
                    key={code} 
                    className={`flex items-center space-x-2 p-2 rounded-md ${colorStyle.hoverBg} transition-colors`}
                  >
                    <RadioGroupItem value={code} id={`activity-${code}`} />
                    <Label htmlFor={`activity-${code}`} className="flex items-center cursor-pointer">
                      <span className={`font-semibold text-sm mr-2 w-8 h-8 flex items-center justify-center rounded ${colorStyle.bg} ${colorStyle.text}`}>
                        {code}
                      </span>
                      <span>{description}</span>
                    </Label>
                  </div>
                );
              })}
              <div 
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RadioGroupItem value="" id="activity-none" />
                <Label htmlFor="activity-none" className="flex items-center cursor-pointer">
                  <span className="font-semibold text-sm mr-2 w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-slate-600 dark:text-white border">
                    —
                  </span>
                  <span>Нет активности</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={weekDays.every(day => !day.activity) && !hasSelectedDays}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
      )}
    </Dialog>
  );
}