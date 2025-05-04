import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import stableStringify from 'fast-json-stable-stringify';

interface AutoSaveOptions {
  /** Интервал дебаунса в миллисекундах (по умолчанию 1000 мс) */
  debounceMs?: number;
  /** URL для отправки данных */
  url: string; 
  /** Метод запроса (по умолчанию POST) */
  method?: 'POST' | 'PUT' | 'PATCH';
  /** Функция для отображения ошибок (по умолчанию используется useToast) */
  onError?: (error: Error) => void;
  /** Обратный вызов при успешном сохранении */
  onSuccess?: (data: any) => void;
  /** Флаг, контролирующий активность автосохранения (по умолчанию true) */
  enabled?: boolean;
  /** Флаг для приостановки автосохранения во время ручного сохранения */
  paused?: boolean;
}

/**
 * Создает стабильный канонический хэш объекта с помощью fast-json-stable-stringify
 */
const jsonHash = (v: any): string => stableStringify(v);

/**
 * Хук для автоматического сохранения данных с дебаунсом
 * Использует стабильный хэш для определения изменений
 * 
 * @param data Данные для отправки на сервер
 * @param options Опции автосохранения
 */
export function useAutoSave<T>(data: T, options: AutoSaveOptions) {
  const { debounceMs = 1000, url, method = 'POST', onError, onSuccess, enabled = true, paused = false } = options;
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Храним стабильный хэш последних сохраненных данных
  const [lastSavedHash, setLastSavedHash] = useState(jsonHash(data));
  
  // Получаем текущий хэш данных
  const currentHash = jsonHash(data);
  
  // Для защиты от слишком частых вызовов
  const lastCheckTimeRef = useRef<number>(0);
  
  // Флаг для предотвращения параллельных сохранений
  const savingRef = useRef(false);
  
  // Ведение логирования количества вызовов
  const callCountRef = useRef(0);
  
  // Для совместимости со старым кодом
  const lastDataStringRef = useRef<string | null>(null);
  
  // Проверка изменений с использованием стабильного хэша
  const isDataChanged = (): boolean => {
    // Увеличиваем счетчик вызовов
    callCountRef.current += 1;
    
    // Логируем только каждый 10-й вызов, чтобы не засорять консоль
    const shouldLog = callCountRef.current % 10 === 0;
    
    // Предотвращаем сравнение слишком частых вызовов
    const now = Date.now();
    const MIN_INTERVAL_MS = 1000; // Минимальный интервал между сравнениями (1 секунда)
    
    if (now - lastCheckTimeRef.current < MIN_INTERVAL_MS) {
      if (shouldLog) console.log(`[useAutoSave] Throttling - ${now - lastCheckTimeRef.current}ms since last check`);
      return false;
    }
    
    lastCheckTimeRef.current = now;
    
    // Сравниваем хэши
    const hasChanges = currentHash !== lastSavedHash;
    
    if (shouldLog) {
      console.log(`[useAutoSave] Changes detected: ${hasChanges}`);
      if (hasChanges) {
        console.log('[useAutoSave] Current hash:', currentHash.substring(0, 20) + '...');
        console.log('[useAutoSave] Last saved hash:', lastSavedHash.substring(0, 20) + '...');
      }
    }
    
    return hasChanges;
  };
  
  // Функция вызываемая после успешного сохранения
  const afterSuccessfulSave = () => {
    // Обновляем хэш последних сохраненных данных
    setLastSavedHash(jsonHash(data));
    // Сбрасываем флаг паузы, если он был установлен
    pausedRef.current = false;
    
    console.log('[useAutoSave] Updated saved data hash after successful save');
  };
  
  // Функция сохранения
  const saveData = async (dataToSave: T): Promise<boolean> => {
    // Проверка на изменения в данных используя хэши
    if (!isDataChanged()) {
      console.log('[useAutoSave] Skipping save - no changes detected by hash comparison');
      return false; // Данные не изменились, не сохраняем
    }
    
    // Если уже идет процесс сохранения или активирована пауза, то пропускаем
    if (savingRef.current || paused) {
      console.log(`[useAutoSave] Skipping save - ${savingRef.current ? 'already saving' : 'paused'}`);
      return false;
    }
    
    // Устанавливаем флаг сохранения
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    
    try {
      console.log('[useAutoSave] Saving data to', url, 'with method', method);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сохранения: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[useAutoSave] Save successful, response:', result);
      
      // Сохраняем последние успешно сохраненные данные
      setLastSavedData(dataToSave);
      
      // Обновляем хэш после успешного сохранения
      afterSuccessfulSave();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useAutoSave] Save error:', error);
      
      setError(error);
      
      if (onError) {
        onError(error);
      } else {
        toast({
          title: "Ошибка сохранения",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsSaving(false);
      // Сбрасываем флаг сохранения
      savingRef.current = false;
    }
  };
  
  // Принудительное сохранение (для кнопки "Сохранить")
  const forceSave = async (): Promise<boolean> => {
    // Очищаем любой таймаут автосохранения
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    console.log('[useAutoSave] Force saving data');
    const success = await saveData(data);
    
    if (success) {
      toast({
        title: "Сохранено",
        description: "Данные успешно сохранены",
        variant: "default",
      });
    }
    
    return success;
  };
  
  // Отслеживаем изменения в состоянии паузы
  const pausedRef = useRef(paused);
  const pauseTimeRef = useRef<number | null>(null);
  // Флаг для отслеживания видимости вкладки
  const isDocumentVisibleRef = useRef(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  
  // Обработчик изменения видимости документа
  useEffect(() => {
    // Обработчик смены видимости вкладки
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isDocumentVisibleRef.current = isVisible;
      
      console.log(`[useAutoSave] Document visibility changed to: ${isVisible ? 'visible' : 'hidden'}`);
      
      // Если вкладка стала видимой, а у нас есть изменения - планируем отложенное сохранение
      if (isVisible && isDataChanged() && !pausedRef.current) {
        console.log('[useAutoSave] Document became visible with pending changes, scheduling delayed save');
        
        // Отменяем существующий таймаут
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Планируем новое сохранение с небольшой задержкой
        timeoutRef.current = setTimeout(() => {
          if (!pausedRef.current) {
            console.log('[useAutoSave] Executing delayed save after tab became visible');
            saveData(data);
          }
        }, 2000);
      }
    };
    
    // Добавляем слушатель только для браузерной среды
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Возвращаем функцию очистки
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [currentHash]);
  
  // Обновляем ссылку при изменении флага paused
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      // Запоминаем время активации паузы
      pauseTimeRef.current = Date.now();
      console.log('[useAutoSave] Pause activated, time:', new Date().toISOString());
    } else {
      pauseTimeRef.current = null;
      console.log('[useAutoSave] Pause deactivated');
    }
  }, [paused]);
  
  // Эффект для автоматического сохранения с дебаунсом
  useEffect(() => {
    // Проверяем наличие изменений с помощью стабильного хэша
    const hasChanges = isDataChanged();
    
    // Если нет изменений, то пропускаем
    if (!hasChanges) {
      return;
    }
    
    // Проверка на таймаут паузы - если пауза активна более 10 секунд, сбрасываем её
    // (защита от "застревания" в состоянии паузы)
    if (pausedRef.current && pauseTimeRef.current) {
      const pauseDuration = Date.now() - pauseTimeRef.current;
      const MAX_PAUSE_DURATION = 10000; // 10 секунд
      
      if (pauseDuration > MAX_PAUSE_DURATION) {
        console.log(`[useAutoSave] Pause timeout exceeded (${pauseDuration}ms > ${MAX_PAUSE_DURATION}ms), resetting pause state`);
        pausedRef.current = false;
        pauseTimeRef.current = null;
      }
    }
    
    // Если автосохранение отключено или поставлено на паузу - выходим сразу
    if (!enabled || pausedRef.current) {
      console.log(`[useAutoSave] Auto-save skipped - ${!enabled ? 'disabled' : 'paused'}`);
      return;
    }
    
    // Отменяем предыдущий таймаут, если он был
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    console.log('[useAutoSave] Scheduling auto-save in', debounceMs, 'ms');
    
    // Используем стандартное значение debounce
    let effectiveDebounceMs = debounceMs;
    
    // Отложенный автосэйв с учетом пауз
    timeoutRef.current = setTimeout(() => {
      // Повторная проверка на паузу прямо перед сохранением
      if (pausedRef.current) {
        console.log('[useAutoSave] Auto-save cancelled - paused flag active');
        return;
      }
      
      // Дополнительная проверка на состояние документа
      // Не сохраняем если браузер неактивен (пользователь переключился на другую вкладку)
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        console.log('[useAutoSave] Auto-save cancelled - document not visible');
        
        // Планируем перепроверку позже, когда пользователь вернется
        setTimeout(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            console.log('[useAutoSave] Document became visible again, scheduling save');
            saveData(data);
          }
        }, 500);
        return;
      }
      
      console.log('[useAutoSave] Auto-save triggered');
      saveData(data);
    }, effectiveDebounceMs);
    
    // Очистка таймаута при размонтировании компонента или перед новым рендером
    return () => {
      if (timeoutRef.current) {
        console.log('[useAutoSave] Cleaning up timeout on unmount/re-render');
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentHash, debounceMs, enabled, paused]);
  
  // Функция для обновления эталонного хэша после успешного сохранения или смены вкладки
  const updateLastSavedHash = () => {
    setLastSavedHash(jsonHash(data));
    console.log('[useAutoSave] Last saved hash updated manually');
  };
  
  // Очистка всех ссылок на currentDataString, которые больше не используются
  if (process.env.NODE_ENV === 'production') {
    // В продакшн режиме уменьшаем количество логов
    console.log = function() {};
  }
  
  return {
    isSaving,
    error,
    forceSave,
    lastSavedData,
    // Возвращаем функцию прямого сохранения для использования в компонентах
    saveData: () => saveData(data),
    // Обновление хэша последнего сохранения (например, после смены вкладки)
    updateLastSavedHash,
    // Возвращаем информацию о текущем состоянии грязи
    hasChanges: isDataChanged(),
    // Функция для возобновления автосохранения
    resume: () => {
      pausedRef.current = false;
      updateLastSavedHash();
    } 
  };
}