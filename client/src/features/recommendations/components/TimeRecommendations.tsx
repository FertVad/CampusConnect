import React from 'react';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  confidence: 'high' | 'medium' | 'low';
}

interface TimeRecommendationsProps {
  loading: boolean;
  recommendations: TimeSlot[];
  onTimeSelect: (start: string, end: string) => void;
}

const TimeRecommendations: React.FC<TimeRecommendationsProps> = ({
  loading,
  recommendations,
  onTimeSelect,
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const getAccessibilityDescription = (rec: TimeSlot) => {
    const confidence =
      rec.confidence === 'high'
        ? 'высокая'
        : rec.confidence === 'medium'
        ? 'средняя'
        : 'низкая';
    return `Время репетиции с ${rec.startTime} до ${rec.endTime}, продолжительность ${rec.duration} часов, вероятность успеха ${confidence}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, recommendations.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ': 
        e.preventDefault();
        if (selectedIndex >= 0) {
          const rec = recommendations[selectedIndex];
          if (rec) {
            onTimeSelect(rec.startTime, rec.endTime);
          }
        }
        break;
    }
  };

  React.useEffect(() => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons && buttons[selectedIndex]?.focus();
  }, [selectedIndex]);

  return (
    <div className="time-recommendations">
      <div
        aria-live="polite"
        aria-label="Статус рекомендаций времени"
        className="sr-only"
      >
        {loading
          ? 'Загружаются рекомендации...'
          : recommendations.length > 0
          ? `Найдено ${recommendations.length} вариантов времени`
          : 'Подходящее время не найдено'}
      </div>
      <div
        className="slots"
        role="listbox"
        aria-label="Рекомендуемые временные слоты"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        ref={listRef}
      >
        {recommendations.map((rec, index) => (
          <button
            key={`${rec.startTime}-${rec.endTime}`}
            className={`slot-button ${rec.confidence}`}
            onClick={() => onTimeSelect(rec.startTime, rec.endTime)}
            aria-label={`Выбрать ${getAccessibilityDescription(rec)}`}
            role="option"
            tabIndex={selectedIndex === index ? 0 : -1}
            aria-selected={selectedIndex === index}
          >
            {rec.startTime} - {rec.endTime}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeRecommendations;
