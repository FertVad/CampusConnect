import React, { useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Импортируем типы из общего модуля
import { 
  ActivityType, 
  ACTIVITY_TYPES, 
  ACTIVITY_COLORS
} from "./ActivityTypes";

// Интерфейс для дня недели
interface WeekDay {
  name: string; // Пн, Вт, и т.д.
  date: number; // Число месяца
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
  onActivityChange,
}: WeekActivityDialogProps) {
  // Дни недели с числами календаря
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  // Выбранная активность
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>("");
  // Отслеживаем клики для определения двойного клика
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  // Отслеживаем, есть ли выбранные дни
  const [hasSelectedDays, setHasSelectedDays] = useState<boolean>(false);

  // Инициализируем дни недели при открытии модального окна
  useLayoutEffect(() => {
    if (weekInfo && open) {
      // Используем даты начала и конца недели из параметра weekInfo
      const { startDate } = weekInfo;
      
      // Создаем массив дней между startDate и endDate (включительно)
      const days: WeekDay[] = [];
      
      // Русское название дней недели
      const daysOfWeekNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      
      // Разбиваем текущую активность на символы для определения активности по дням
      let dailyActivities: ActivityType[] = Array(7).fill("") as ActivityType[];

      // Определяем активности по дням
      if (currentActivity) {
        if (currentActivity.length === 1) {
          // Если активность установлена и это один символ - применяем его ко всем дням
          dailyActivities = Array(7).fill(currentActivity) as ActivityType[];
        } else {
          // Если активность - строка символов, распределяем их по дням
          const chars = currentActivity.split("");
          for (let i = 0; i < Math.min(chars.length, 7); i++) {
            if (chars[i] && chars[i].trim() !== "") {
              dailyActivities[i] = chars[i] as ActivityType;
            }
          }
        }
      }

      // Создаем дни недели с календарными датами и активностями
      const currentDate = new Date(startDate);
      
      for (let i = 0; i < 7; i++) {
        // Создаем копию текущей даты
        const date = new Date(currentDate);
        
        // Определяем название дня недели
        const dayOfWeek = date.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
        const dayName = daysOfWeekNames[dayOfWeek];
        
        days.push({
          name: dayName,
          date: date.getDate(), // число месяца
          selected: false,
          activity: dailyActivities[i] || "",
        });
        
        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setWeekDays(days);

      // Определяем преобладающую активность
      const activityCounts = new Map<ActivityType, number>();
      days.forEach((day) => {
        if (day.activity) {
          activityCounts.set(
            day.activity,
            (activityCounts.get(day.activity) || 0) + 1,
          );
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
      setHasSelectedDays(false);
    }
  }, [weekInfo, currentActivity, open]);

  // Обработчик клика по дню недели
  const handleDayClick = (index: number) => {
    const now = Date.now();
    const timeDiff = now - lastClickTime;

    if (timeDiff < 300) {
      // Двойной клик (300мс)
      // Выбираем или снимаем выбор со всех рабочих дней (Пн-Пт)
      const newDays = [...weekDays];

      // Проверяем, все ли рабочие дни выбраны
      const allWorkdaysSelected = newDays
        .slice(0, 5)
        .every((day) => day.selected);

      // Если все рабочие дни выбраны, снимаем выбор, иначе выбираем все
      for (let i = 0; i < 5; i++) {
        // Пн-Пт (индексы 0-4)
        newDays[i].selected = !allWorkdaysSelected;
      }

      setWeekDays(newDays);
      setHasSelectedDays(newDays.some((day) => day.selected));
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
          newDays[index].selected = false;   
          setHasSelectedDays(false);         
          setSelectedActivity("");          
        }
      }

      setWeekDays(newDays);
      setHasSelectedDays(newDays.some((day) => day.selected));
    }

    setLastClickTime(now);
  };

  // Обработчик выбора активности
  const handleActivitySelect = (value: string) => {
    const activityValue = value as ActivityType;

    // если нет выделенных дней — просто запоминаем радиокнопку
    if (!hasSelectedDays) {
      setSelectedActivity(activityValue);
      return;
    }

    // применяем активность к выделенным дням + снимаем выделение
    const updatedDays = weekDays.map((day) =>
      day.selected ? { ...day, activity: activityValue, selected: false } : day,
    );

    setWeekDays(updatedDays);
    setHasSelectedDays(false);
    setSelectedActivity(""); // сброс выбранной активности
  };

  // Обработчик сохранения
  const handleSave = () => {
    let finalDays = weekDays;

    // если остались выделенные дни с выбранной активностью — применяем
    if (hasSelectedDays && selectedActivity) {
      finalDays = weekDays.map((day) =>
        day.selected
          ? { ...day, activity: selectedActivity, selected: false }
          : day,
      );
    }

    // конвертируем в строку фиксированной длины 7 (пробел вместо пустого)
    const activitiesString = finalDays.map(d => d.activity || ' ').join('');

    onActivityChange(
      activitiesString.trim() ? (activitiesString as ActivityType) : "",
    );

    // закрываем диалог и сбрасываем вспомогательные состояния
    onOpenChange(false);
    setWeekDays(finalDays);
    setHasSelectedDays(false);
    setSelectedActivity("");
  };

  // Стиль для дня недели
  const getDayStyle = (day: WeekDay) => {
    let baseStyle = "";

    // Установка базового стиля для дня
    if (!day.activity && !day.selected) {
      // Если нет активности и день не выбран - стандартный фон
      baseStyle = "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white";
    } else if (day.selected) {
      // Если день выбран - показываем прозрачным цветом активности
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
  
  // Если диалог закрыт или нет данных, ничего не рендерим
  if (!open || !weekInfo) return null;
  
  // Рендерим содержимое диалога
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[90vh] overflow-hidden w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute right-4 top-4 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
          onClick={() => onOpenChange(false)}
        >
          ×
        </button>
        
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Учебная неделя {weekInfo.weekNumber}
            </h2>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {weekInfo.startDate.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
              {" — "}
              {weekInfo.endDate.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
              {", курс "}{weekInfo.courseId}
            </p>
          </div>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2 pb-2">
            <div className="py-4 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 mb-4"
              onDoubleClick={(e) => {
                e.preventDefault();
                const hasSelected = weekDays.some((day) => day.selected);

                if (hasSelected) {
                  // Сбрасываем все выделения
                  const updatedDays = weekDays.map((day) => ({...day, selected: false}));
                  setWeekDays(updatedDays);
                  setHasSelectedDays(false);
                } else {
                  // Выбираем рабочие дни (Пн-Пт)
                  const newDays = [...weekDays];
                  
                  // Выбираем все рабочие дни
                  for (let i = 0; i < 5; i++) {
                    newDays[i].selected = true;
                  }
                  
                  setWeekDays(newDays);
                  setHasSelectedDays(true);
                }
              }}
            >
              <div className="grid grid-cols-7 gap-2 px-4">
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer transition-all ${getDayStyle(day)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(i);
                    }}
                  >
                    <div className="text-xs font-semibold">{day.name}</div>
                    <div className="text-sm font-bold">{day.date}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-medium mb-1">
                Выберите тип активности:
              </h4>
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
                      <Label
                        htmlFor={`activity-${code}`}
                        className="flex items-center cursor-pointer"
                      >
                        <span
                          className={`font-semibold text-sm mr-2 w-8 h-8 flex items-center justify-center rounded ${colorStyle.bg} ${colorStyle.text}`}
                        >
                          {code}
                        </span>
                        <span>{description}</span>
                      </Label>
                    </div>
                  );
                })}
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <RadioGroupItem value="" id="activity-none" />
                  <Label
                    htmlFor="activity-none"
                    className="flex items-center cursor-pointer"
                  >
                    <span className="font-semibold text-sm mr-2 w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-slate-600 dark:text-white border">
                      —
                    </span>
                    <span>Нет активности</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="pt-4 border-t mt-4">
              <div className="flex justify-center">
                <Button 
                  variant={selectedActivity ? "default" : "secondary"}
                  onClick={() => {
                    // Создаем строку из 7 одинаковых символов выбранной активности
                    const activityValue = selectedActivity || "";
                    const fullWeekActivity = activityValue.repeat(7);
                    
                    // Сохраняем изменения, но НЕ закрываем диалог
                    onActivityChange(fullWeekActivity as ActivityType);
                  }}
                  className={`w-full ${
                    selectedActivity 
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                      : ""
                  }`}
                >
                  Применить ко всей неделе
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={weekDays.every((day) => !day.activity) && !hasSelectedDays}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}