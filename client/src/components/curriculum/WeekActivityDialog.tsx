import React, { useState, useEffect } from "react";
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
export type ActivityType = "У" | "К" | "П" | "Э" | "Д" | "";

// Типы активностей с описаниями
export const ACTIVITY_TYPES: { [key in Exclude<ActivityType, "">]: string } = {
  "У": "Учебный процесс",
  "К": "Каникулы",
  "П": "Практика",
  "Э": "Экзаменационная сессия",
  "Д": "Дипломное проектирование"
};

// Цвета для активностей
export const ACTIVITY_COLORS: { [key in Exclude<ActivityType, "">]: { bg: string, text: string, hoverBg: string } } = {
  "У": { bg: "bg-blue-200", text: "text-blue-800", hoverBg: "hover:bg-blue-300" },
  "К": { bg: "bg-gray-200", text: "text-gray-800", hoverBg: "hover:bg-gray-300" },
  "П": { bg: "bg-yellow-200", text: "text-yellow-800", hoverBg: "hover:bg-yellow-300" },
  "Э": { bg: "bg-red-200", text: "text-red-800", hoverBg: "hover:bg-red-300" },
  "Д": { bg: "bg-purple-200", text: "text-purple-800", hoverBg: "hover:bg-purple-300" },
};

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
  if (!weekInfo) return null;

  // Дни недели с числами календаря
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  // Выбранная активность
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>(currentActivity);
  // Отслеживаем клики для определения двойного клика
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  // Отслеживаем, есть ли выбранные дни
  const [hasSelectedDays, setHasSelectedDays] = useState<boolean>(false);

  // Инициализируем дни недели при открытии модального окна
  useEffect(() => {
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

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        days.push({
          name: daysOfWeek[i],
          date: date.getDate(),
          selected: false,
          activity: ""
        });
      }

      setWeekDays(days);
      setSelectedActivity(currentActivity);
      setHasSelectedDays(false);
    }
  }, [weekInfo, currentActivity]);

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
      newDays[index].selected = !newDays[index].selected;
      setWeekDays(newDays);
      setHasSelectedDays(newDays.some(day => day.selected));
    }
    
    setLastClickTime(now);
  };

  // Применение активности к выбранным дням
  const applyActivityToSelected = () => {
    const updatedDays = weekDays.map(day => ({
      ...day,
      activity: day.selected ? selectedActivity : day.activity
    }));
    
    setWeekDays(updatedDays);
  };

  // Обработчик выбора активности
  const handleActivitySelect = (value: string) => {
    setSelectedActivity(value as ActivityType);
    // Немедленно применяем выбранную активность к выбранным дням
    if (hasSelectedDays) {
      const updatedDays = weekDays.map(day => ({
        ...day,
        activity: day.selected ? (value as ActivityType) : day.activity
      }));
      setWeekDays(updatedDays);
    }
  };

  // Обработчик сохранения
  const handleSave = () => {
    // Здесь будет логика сохранения состояния дней для всей недели
    onActivityChange(selectedActivity);
    onOpenChange(false);
  };

  // Стиль для дня недели в зависимости от активности и выбранности
  const getDayStyle = (day: WeekDay) => {
    if (day.selected) {
      return "bg-blue-100 dark:bg-blue-800 border-blue-500 dark:border-blue-400 border-2";
    }
    
    if (day.activity) {
      const colorStyle = ACTIVITY_COLORS[day.activity as Exclude<ActivityType, "">];
      return `${colorStyle.bg}`;
    }
    
    return "bg-slate-100 dark:bg-slate-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Активность для недели {weekInfo.weekNumber}</DialogTitle>
          <DialogDescription>
            {weekInfo.monthName}, курс {weekInfo.courseId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div 
            className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700"
            onDoubleClick={() => {
              // Обработка двойного клика по всей области
              const newDays = [...weekDays];
              const allWorkdaysSelected = newDays.slice(0, 5).every(day => day.selected);
              
              for (let i = 0; i < 5; i++) {
                newDays[i].selected = !allWorkdaysSelected;
              }
              
              setWeekDays(newDays);
              setHasSelectedDays(newDays.some(day => day.selected));
            }}
          >
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer transition-all ${getDayStyle(day)}`}
                  onClick={() => handleDayClick(i)}
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
                      <span className={`font-semibold text-lg mr-2 w-8 h-8 flex items-center justify-center rounded ${colorStyle.bg} ${colorStyle.text}`}>
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
                  <span className="font-semibold text-lg mr-2 w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-slate-950 border">
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
            disabled={!hasSelectedDays || selectedActivity === ""}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}