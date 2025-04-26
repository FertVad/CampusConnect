import React, { useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Тип активности
// Может быть одиночным символом или строкой символов (для комбинации активностей по дням)
export type ActivityType = "У" | "К" | "П" | "Э" | "Д" | "" | string;

// Типы активностей с описаниями
export const ACTIVITY_TYPES: { [key in Exclude<ActivityType, "">]: string } = {
  У: "Учебный процесс",
  К: "Каникулы",
  П: "Практика",
  Э: "Экзаменационная сессия",
  Д: "Дипломное проектирование",
};

// Цвета для активностей (пастельные оттенки)
export const ACTIVITY_COLORS: {
  [key in Exclude<ActivityType, "">]: {
    bg: string;
    text: string;
    hoverBg: string;
    color: string;
  };
} = {
  У: { bg: "bg-blue-100", text: "text-blue-800", hoverBg: "hover:bg-blue-200", color: "#dbeafe" },
  К: { bg: "bg-gray-100", text: "text-gray-800", hoverBg: "hover:bg-gray-200", color: "#f3f4f6" },
  П: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    hoverBg: "hover:bg-yellow-200",
    color: "#fef9c3"
  },
  Э: { bg: "bg-red-100", text: "text-red-800", hoverBg: "hover:bg-red-200", color: "#fee2e2" },
  Д: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    hoverBg: "hover:bg-purple-200",
    color: "#f3e8ff"
  },
};

// Функция для создания градиента из активностей дней недели
export const weekGradient = (days: string): string => {
  if (!days || days.length === 0) return 'white';
  
  // Если только один тип активности - используем сплошной цвет
  if (days.length === 1 || new Set(days.split('')).size === 1) {
    const activity = days[0] as Exclude<ActivityType, "">;
    return ACTIVITY_COLORS[activity]?.color || '#f3f4f6';
  }
  
  // Если разные активности - создаем градиент
  const dayActivities = days.padEnd(7, days[days.length - 1]).split('');
  const percentStep = 100 / 7;
  
  let gradient = 'linear-gradient(to right';
  
  dayActivities.forEach((activity, index) => {
    if (!activity || activity === ' ') {
      activity = 'К'; // Используем цвет каникул для пустых дней
    }
    
    const color = (activity && activity in ACTIVITY_COLORS) 
      ? ACTIVITY_COLORS[activity as Exclude<ActivityType, "">].color 
      : '#f3f4f6';
    
    const start = index * percentStep;
    const end = (index + 1) * percentStep;
    
    gradient += `, ${color} ${start}%, ${color} ${end}%`;
  });
  
  gradient += ')';
  return gradient;
};

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
  // Не используем раннее возвращение null, так как это вызывает проблемы с состоянием
  // вместо этого используем условный рендеринг в JSX

  // Дни недели с числами календаря
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  // Выбранная активность
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>(
    currentActivity || "",
  );
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
      dailyActivities = Array(7).fill("") as ActivityType[];

      // Определяем активности по дням
      if (currentActivity) {
        if (currentActivity.length === 1) {
          // Если активность установлена и это один символ - применяем его ко всем дням
          dailyActivities = Array(7).fill(currentActivity) as ActivityType[];
        } else {
          // Если активность - строка символов, распределяем их по дням
          // Если символов меньше 7, оставшиеся дни будут пустыми
          // Если символов больше 7, используем только первые 7
          const chars = currentActivity.split("");
          for (let i = 0; i < Math.min(chars.length, 7); i++) {
            if (chars[i] && chars[i].trim() !== "") {
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
          activity: dailyActivities[i] || "",
        });
      }

      setWeekDays(days);

      // Определяем преобладающую активность для выбора в RadioGroup
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

    if (timeDiff < 300) {
      // Двойной клик (300мс)
      // Выбираем или снимаем выбор со всех рабочих дней (Пн-Пт)
      const newDays = [...weekDays];

      // Проверяем, все ли рабочие дни выбраны
      const allWorkdaysSelected = newDays
        .slice(0, 5)
        .every((day) => day.selected);

      // Если все рабочие дни выбраны, снима �м выбор, иначе выбираем все
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

          // убираем подсветку // флаг выделения = false        // Radio‑кнопка — в "ничего"
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
  // helper — снимает выделение со всех дней
  const clearSelection = (days: WeekDay[]) =>
    days.map((d) => ({ ...d, selected: false }));

  // ===== 1. handleActivitySelect =====
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

  // ===== 2. handleSave =====
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

  // Стиль для дня недели в зависимости от активности и выбранности
  const getDayStyle = (day: WeekDay) => {
    let baseStyle = "";

    // Установка базового стиля для дня
    if (!day.activity && !day.selected) {
      // Если нет активности и день не выбран - стандартный фон
      baseStyle =
        "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white";
    } else if (day.selected) {
      // Если день выбран - показываем прозрачным цветом активности или предварительный выбор
      if (selectedActivity && selectedActivity in ACTIVITY_COLORS) {
        // Используем цвет выбранной активности для предпросмотра
        const previewColorStyle =
          ACTIVITY_COLORS[selectedActivity as Exclude<ActivityType, "">];
        baseStyle = `${previewColorStyle.bg} text-slate-800 ring-2 ring-blue-600 dark:ring-blue-400`;
      } else {
        // Если активность не выбрана, но день выделен
        baseStyle =
          "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white ring-2 ring-blue-600 dark:ring-blue-400";
      }
    } else if (day.activity && day.activity in ACTIVITY_COLORS) {
      // Если у дня есть активность и он не выбран
      const colorStyle =
        ACTIVITY_COLORS[day.activity as Exclude<ActivityType, "">];
      baseStyle = `${colorStyle.bg} text-slate-800`;
    } else if (day.activity) {
      // Если у дня активность не из предопределенных - используем нейтральный цвет
      baseStyle =
        "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white";
    }

    return baseStyle;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && weekInfo && (
        <DialogContent
          key={`dialog-week-${weekInfo.courseId}-${weekInfo.weekNumber}`}
          className="sm:max-w-md calendar-dialog-content"
        >
          <DialogHeader>
            <DialogTitle>
              Активность для недели {weekInfo.weekNumber}
            </DialogTitle>
            <DialogDescription>
              {weekInfo.monthName}, курс {weekInfo.courseId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium mb-1">
                Выберите тип активности:
              </h4>
              <RadioGroup 
                className="grid grid-cols-5 gap-2" 
                value={selectedActivity} 
                onValueChange={handleActivitySelect}
              >
                {/* Создаем радиокнопки для всех типов активностей */}
                {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
                  // Получаем стиль для кнопки
                  const colorStyle = {
                    bg: ACTIVITY_COLORS[code as Exclude<ActivityType, "">].bg,
                    text: ACTIVITY_COLORS[code as Exclude<ActivityType, "">].text,
                    hoverBg: ACTIVITY_COLORS[code as Exclude<ActivityType, "">].hoverBg,
                  };
                  
                  return (
                    <div key={code} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={code} 
                        id={`activity-${code}`} 
                        className={`peer sr-only`} 
                      />
                      <Label
                        htmlFor={`activity-${code}`}
                        className={`flex flex-col items-center justify-center p-2 rounded-md cursor-pointer border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.hoverBg} peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-blue-600 dark:peer-data-[state=checked]:ring-blue-400 transition-all flex-1 text-center h-full`}
                      >
                        <span className="text-sm font-semibold">{code}</span>
                        <span className="text-xs truncate max-w-full">{description}</span>
                      </Label>
                    </div>
                  );
                })}
                
                {/* Опция для очистки активности */}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="" 
                    id="activity-none" 
                    className="peer sr-only" 
                  />
                  <Label
                    htmlFor="activity-none"
                    className="flex flex-col items-center justify-center p-2 rounded-md cursor-pointer border bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-blue-600 dark:peer-data-[state=checked]:ring-blue-400 transition-all flex-1 text-center h-full"
                  >
                    <span className="text-sm font-semibold">-</span>
                    <span className="text-xs">Нет</span>
                  </Label>
                </div>
              </RadioGroup>
              
              {/* Текущая активность */}
              <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
                <strong>Текущая активность:</strong> {currentActivity ? 
                  <span className="font-bold">{currentActivity}</span> : 
                  <span className="italic text-slate-500">не установлена</span>}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col space-y-2">
            {/* Кнопка "Применить ко всей неделе" */}
            <Button
              disabled={!selectedActivity}
              onClick={() => {
                if (selectedActivity) {
                  // Создаем строку из 7 одинаковых символов выбранной активности
                  const fullWeekActivity = selectedActivity.repeat(7);
                  // Сохраняем и закрываем диалог
                  onActivityChange(fullWeekActivity as ActivityType);
                  onOpenChange(false);
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Применить ко всей неделе
            </Button>
            
            <div className="flex w-full space-x-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
              >
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
