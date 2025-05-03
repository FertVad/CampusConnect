import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

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
 * Хук для автоматического сохранения данных с дебаунсом
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
  
  // Для отслеживания предыдущих данных через строковое представление, а не ссылки объектов
  const lastDataStringRef = useRef<string | null>(null);
  const currentDataString = JSON.stringify(data);
  
  // Для защиты от слишком частых вызовов
  const lastCheckTimeRef = useRef<number>(0);
  
  // Флаг для предотвращения параллельных сохранений
  const savingRef = useRef(false);
  
  // Ведение логирования количества вызовов
  const callCountRef = useRef(0);
  
  // Сравнение данных чтобы узнать, изменились ли они
  const isDataChanged = (oldData: T | null, newData: T): boolean => {
    // Увеличиваем счетчик вызовов
    callCountRef.current += 1;
    
    // Логируем только каждый 10-й вызов чтобы не засорять консоль
    const shouldLog = callCountRef.current % 10 === 0;
    
    if (!oldData) {
      if (shouldLog) console.log('[useAutoSave] No previous data reference, treating as changed');
      return true;
    }
    
    // Предотвращаем сравнение слишком частых вызовов
    const now = Date.now();
    const MIN_INTERVAL_MS = 1000; // Увеличенный минимальный интервал между сравнениями (1 секунда)
    
    if (now - lastCheckTimeRef.current < MIN_INTERVAL_MS) {
      if (shouldLog) console.log(`[useAutoSave] Throttling - ${now - lastCheckTimeRef.current}ms since last check`);
      return false;
    }
    lastCheckTimeRef.current = now;
    
    try {
      // Сравниваем текущую JSON строку с сохраненной ранее
      // Это оптимальнее, чем создавать JSON строку для oldData каждый раз
      if (lastDataStringRef.current === currentDataString) {
        if (shouldLog) console.log('[useAutoSave] No changes detected (string comparison)');
        return false;
      }
      
      // Дополнительная проверка на существенность изменений - сравниваем размеры строк
      // Слишком маленькие изменения могут быть результатом перестановки полей или изменения форматирования
      const lengthDiff = Math.abs(
        (lastDataStringRef.current?.length || 0) - currentDataString.length
      );
      
      // Если разница менее 1% и строки достаточно длинные, считаем это несущественным изменением
      const minLength = Math.min((lastDataStringRef.current?.length || 0), currentDataString.length);
      if (minLength > 100 && lengthDiff < minLength * 0.01) {
        console.log(`[useAutoSave] Changes too small (${lengthDiff} chars diff, ${(lengthDiff/minLength*100).toFixed(2)}%), ignoring`);
        return false;
      }
      
      console.log('[useAutoSave] Significant data change detected, length diff:', lengthDiff);
      return true;
    } catch (err) {
      console.error('[useAutoSave] Error comparing data:', err);
      // В случае ошибки возвращаем false, чтобы не срабатывало автосохранение из-за ошибки
      return false;
    }
  };
  
  // Функция сохранения
  const saveData = async (dataToSave: T): Promise<boolean> => {
    // Проверка на изменения в данных
    if (!isDataChanged(lastSavedData, dataToSave)) {
      console.log('[useAutoSave] Skipping save - no changes detected');
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
      // Обновляем строковое представление
      lastDataStringRef.current = JSON.stringify(dataToSave);
      
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
      if (isVisible && currentDataString !== lastDataStringRef.current && !pausedRef.current) {
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
  }, [currentDataString]);
  
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
    // Если нет изменений в данных (проверяем через глубокое сравнение), пропускаем
    if (currentDataString === lastDataStringRef.current) {
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
    
    // Обновляем ссылку на текущее строковое представление ПЕРЕД установкой нового таймаута
    // Это позволяет другим вызовам useEffect видеть актуальное состояние
    lastDataStringRef.current = currentDataString;
    
    console.log('[useAutoSave] Scheduling auto-save in', debounceMs, 'ms');
    
    // Увеличиваем интервал сохранения пропорционально размеру данных для предотвращения слишком частых сохранений больших объектов
    // Это помогает предотвратить перегрузку сервера при работе с большими планами
    const dataSize = currentDataString.length;
    let effectiveDebounceMs = Math.max(debounceMs, 2000); // Минимум 2 секунды

    // Если данные больше определенного порога, увеличиваем задержку
    // Используем логарифмическую шкалу для предотвращения слишком больших задержек
    if (dataSize > 5000) { // Если больше 5KB
      const scaleFactor = Math.log10(dataSize / 1000);
      const additionalDelay = scaleFactor * 500; // Дополнительная задержка пропорциональна логарифму размера
      effectiveDebounceMs += Math.min(additionalDelay, 3000); // Но не более 3 секунд дополнительной задержки
      console.log(`[useAutoSave] Large data (${dataSize} bytes), increasing debounce to ${effectiveDebounceMs}ms`);
    }
    
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
  }, [currentDataString, debounceMs, enabled, paused]);
  
  return {
    isSaving,
    error,
    forceSave,
    lastSavedData,
    // Возвращаем функцию прямого сохранения для использования в компонентах
    saveData: () => saveData(data)
  };
}