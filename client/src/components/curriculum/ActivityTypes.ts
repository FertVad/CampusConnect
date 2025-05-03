// Тип активности - общий модуль для всех компонентов календаря
// Исправляет проблему импорта/экспорта между компонентами

// Тип активности может быть одиночным символом или строкой символов (для комбинации активностей по дням)
export type ActivityType = "У" | "К" | "П" | "Э" | "Д" | "" | string;

// Типы активностей с описаниями
export const ACTIVITY_TYPES: { [key in Exclude<ActivityType, "">]: string } = {
  У: "Учебный процесс",
  К: "Каникулы",
  П: "Практика",
  Э: "Экзаменационная сессия",
  Д: "Дипломное проектирование",
};

// Цвета для активностей
export const ACTIVITY_COLORS: {
  [key in Exclude<ActivityType, "">]: {
    bg: string;
    text: string;
    hoverBg: string;
    color: string;
  };
} = {
  У: { 
    bg: "bg-blue-300", 
    text: "text-blue-900", 
    hoverBg: "hover:bg-blue-400", 
    color: "#93c5fd" 
  },
  К: { 
    bg: "bg-gray-300", 
    text: "text-gray-900", 
    hoverBg: "hover:bg-gray-400", 
    color: "#d1d5db" 
  },
  П: {
    bg: "bg-yellow-300",
    text: "text-yellow-900",
    hoverBg: "hover:bg-yellow-400",
    color: "#fde047"
  },
  Э: { 
    bg: "bg-red-300", 
    text: "text-red-900", 
    hoverBg: "hover:bg-red-400", 
    color: "#fca5a5" 
  },
  Д: {
    bg: "bg-purple-300",
    text: "text-purple-900",
    hoverBg: "hover:bg-purple-400",
    color: "#d8b4fe"
  },
};

// Функция создания градиента для недель с разными типами активности
export const weekGradient = (days: string): string => {
  // Удалены лишние логи для оптимизации производительности
  
  if (!days || days.length === 0) {
    return 'white';
  }
  
  // Если только один тип активности - используем сплошной цвет
  if (days.length === 1 || new Set(days.split('')).size === 1) {
    const activity = days[0] as Exclude<ActivityType, "">;
    
    if (activity in ACTIVITY_COLORS) {
      return ACTIVITY_COLORS[activity].color;
    }
    return '#f3f4f6'; // Светло-серый для неизвестных активностей
  }
  
  // Если разные активности - создаем градиент
  const dayActivities = days.padEnd(7, days[days.length - 1]).split('');
  const percentStep = 100 / 7;
  
  let gradient = 'linear-gradient(to right';
  
  dayActivities.forEach((activity, index) => {
    if (!activity || activity === ' ') {
      activity = 'К'; // Используем цвет каникул для пустых дней
    }
    
    let color = '#f3f4f6';
    if (activity && activity in ACTIVITY_COLORS) {
      color = ACTIVITY_COLORS[activity as Exclude<ActivityType, "">].color;
    }
    
    const start = index * percentStep;
    const end = (index + 1) * percentStep;
    
    gradient += `, ${color} ${start}%, ${color} ${end}%`;
  });
  
  gradient += ')';
  return gradient;
};

// Функция для получения стиля ячейки в зависимости от активности
export const getActivityStyle = (activity: ActivityType): { bg: string, text: string } => {
  const defaultStyle = { bg: "bg-white dark:bg-slate-950", text: "text-slate-400" };
  
  if (!activity || activity === "") {
    return defaultStyle;
  }
  
  // Если строка из одного символа, возвращаем соответствующий стиль
  if (activity.length === 1 && activity in ACTIVITY_COLORS) {
    return {
      bg: ACTIVITY_COLORS[activity as Exclude<ActivityType, "">].bg,
      text: ACTIVITY_COLORS[activity as Exclude<ActivityType, "">].text
    };
  }
  
  // Для случая, когда в ячейке комбинация активностей по дням недели
  // Берем первый символ как основной
  if (activity.length > 1 && activity[0] in ACTIVITY_COLORS) {
    return {
      bg: ACTIVITY_COLORS[activity[0] as Exclude<ActivityType, "">].bg,
      text: ACTIVITY_COLORS[activity[0] as Exclude<ActivityType, "">].text
    };
  }
  
  return { bg: "bg-gray-200 dark:bg-slate-700", text: "text-slate-900 dark:text-slate-100" };
};