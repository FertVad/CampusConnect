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

// Цвета для активностей (яркие оттенки)
export const ACTIVITY_COLORS: {
  [key in Exclude<ActivityType, "">]: {
    bg: string;
    text: string;
    hoverBg: string;
    color: string;
  };
} = {
  У: { bg: "bg-blue-300", text: "text-blue-900", hoverBg: "hover:bg-blue-400", color: "#93c5fd" },
  К: { bg: "bg-gray-300", text: "text-gray-900", hoverBg: "hover:bg-gray-400", color: "#d1d5db" },
  П: {
    bg: "bg-yellow-300",
    text: "text-yellow-900",
    hoverBg: "hover:bg-yellow-400",
    color: "#fde047"
  },
  Э: { bg: "bg-red-300", text: "text-red-900", hoverBg: "hover:bg-red-400", color: "#fca5a5" },
  Д: {
    bg: "bg-purple-300",
    text: "text-purple-900",
    hoverBg: "hover:bg-purple-400",
    color: "#d8b4fe"
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

// Функция для создания градиента для недель на стыке месяцев
export const monthTransitionGradient = (
  daysInCurrentMonth: number, 
  daysInNextMonth: number, 
  isEvenCurrentMonth: boolean,
  isDarkMode: boolean = false
): string => {
  // Проверка параметров
  if (daysInCurrentMonth <= 0 || daysInNextMonth <= 0) {
    return ''; // Возвращаем пустую строку, если данные неверны
  }
  
  // Общее количество дней в неделе
  const totalDays = daysInCurrentMonth + daysInNextMonth;
  
  // Рассчитываем точный процент для текущего месяца (как в задании: LEFT = daysCurr/7*100)
  const LEFT = Math.round((daysInCurrentMonth / 7) * 100);
  
  // Определяем CSS-переменные для светлой и темной темы
  const currVar = `var(--curr)`;
  const nextVar = `var(--next)`;
  
  // Строим градиент с переменными CSS для поддержки динамического изменения темы
  // linear-gradient(to right, var(--curr) 0%, var(--curr) LEFT%, var(--next) LEFT%, var(--next) 100%)
  const gradient = `linear-gradient(to right, ${currVar} 0%, ${currVar} ${LEFT}%, ${nextVar} ${LEFT}%, ${nextVar} 100%)`;
  
  // CSS переменные для светлой и темной темы
  const style = document.createElement('style');
  
  // Определяем цвета для светлой темы
  const lightCurrentColor = isEvenCurrentMonth ? '#f1f5f9' : '#e2e8f0'; // slate-100 : slate-200
  const lightNextColor = !isEvenCurrentMonth ? '#f1f5f9' : '#e2e8f0'; // slate-100 : slate-200
  
  // Определяем цвета для темной темы
  const darkCurrentColor = isEvenCurrentMonth ? '#1e293b' : '#334155'; // slate-800 : slate-700
  const darkNextColor = !isEvenCurrentMonth ? '#1e293b' : '#334155'; // slate-800 : slate-700
  
  // Добавляем CSS-переменные в документ, если их еще нет
  if (!document.querySelector('#month-gradient-vars')) {
    style.id = 'month-gradient-vars';
    style.innerHTML = `
      :root {
        --curr: ${lightCurrentColor};
        --next: ${lightNextColor};
      }
      
      @media (prefers-color-scheme: dark) {
        :root {
          --curr: ${darkCurrentColor};
          --next: ${darkNextColor};
        }
      }
    `;
    document.head.appendChild(style);
  }
  
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
      // Используем даты начала и конца недели из параметра weekInfo
      // Неделя может начинаться с любого дня недели (не обязательно с понедельника)
      const { startDate, endDate } = weekInfo;
      
      // Создаем массив дней между startDate и endDate (включительно)
      const days: WeekDay[] = [];
      
      // Русское название дней недели
      const daysOfWeekNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      
      // Разбиваем текущую активность на символы для определения активности по дням
      let dailyActivities: ActivityType[] = [];

      // Инициализируем массив пустыми значениями (для 7 дней)
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
          // При открытии диалога дни НЕ выбраны
          selected: false,
          // Устанавливаем активность из разобранной строки или пустую
          activity: dailyActivities[i] || "",
        });
        
        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);
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
          className="sm:max-w-md calendar-dialog-content bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-lg"
        >
          <DialogHeader className="pb-3 border-b mb-4">
            <DialogTitle className="text-lg font-bold">
              Учебная неделя {weekInfo.weekNumber}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium">
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
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4" onClick={handleContainerClick}>
            <div
              className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700"
              onDoubleClick={(e) => {
                // Обработка двойного клика по всей области
                e.preventDefault(); // Предотвращаем выделение текста

                // Проверяем наличие выбранных дней
                const hasSelected = weekDays.some((day) => day.selected);

                if (hasSelected) {
                  // Если есть выбранные дни - сбрасываем все выделения
                  const updatedDays = weekDays.map((day) => ({
                    ...day,
                    selected: false,
                  }));
                  setWeekDays(updatedDays);
                  setHasSelectedDays(false);
                } else {
                  // Если выделенных дней нет - проверяем состояние рабочих дней
                  const newDays = [...weekDays];

                  // Проверяем, все ли рабочие дни (Пн-Пт) имеют одинаковую активность
                  const workdays = newDays.slice(0, 5);
                  const firstActivity = workdays[0].activity;
                  const allHaveSameActivity =
                    firstActivity &&
                    workdays.every((day) => day.activity === firstActivity);

                  // Если все рабочие дни имеют одинаковую непустую активность,
                  // то при двойном клике очищаем их активность
                  if (allHaveSameActivity) {
                    for (let i = 0; i < 5; i++) {
                      // Пн-Пт (индексы 0-4)
                      newDays[i].selected = true;
                      newDays[i].activity = ""; // Очищаем активность
                    }
                  } else {
                    // Иначе выбираем все рабочие дни и устанавливаем им текущую активность
                    for (let i = 0; i < 5; i++) {
                      // Пн-Пт (индексы 0-4)
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
              <h4 className="text-sm font-medium mb-1">
                Выберите тип активности:
              </h4>
              <RadioGroup
                value={selectedActivity}
                onValueChange={handleActivitySelect}
                className="grid grid-cols-1 gap-2"
              >
                {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
                  const colorStyle =
                    ACTIVITY_COLORS[code as Exclude<ActivityType, "">];
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
          </div>

          <div className="pt-3 border-t">
            <div className="flex justify-center mb-4">
              <Button 
                variant={selectedActivity ? "default" : "secondary"}
                onClick={() => {
                  // Создаем строку из 7 одинаковых символов выбранной активности
                  // или пустой строки, если выбрано "Нет активности"
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
          
          <DialogFooter className="sm:justify-between">
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
              disabled={
                weekDays.every((day) => !day.activity) && !hasSelectedDays
              }
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
