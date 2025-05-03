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
  
  // Флаг для предотвращения параллельных сохранений
  const savingRef = useRef(false);
  
  // Сравнение данных чтобы узнать, изменились ли они
  const isDataChanged = (oldData: T | null, newData: T): boolean => {
    if (!oldData) return true;
    
    try {
      // Используем глубокое сравнение для всех типов данных через JSON строки
      const oldJson = JSON.stringify(oldData);
      const newJson = JSON.stringify(newData);
      const changed = oldJson !== newJson;
      
      if (changed) {
        console.log('[useAutoSave] Data changed (deep comparison)');
      } else {
        console.log('[useAutoSave] No changes detected (deep comparison)');
      }
      
      return changed;
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
  
  // Эффект для автоматического сохранения с дебаунсом
  // Используем только строковое представление объекта данных в качестве зависимости
  useEffect(() => {
    // Если строковое представление не изменилось, ничего не делаем
    if (currentDataString === lastDataStringRef.current) {
      return;
    }
    
    // Не запускаем автосохранение при отключенных флагах или активной паузе
    if (!enabled || paused) {
      console.log(`[useAutoSave] Auto-save skipped - ${!enabled ? 'disabled' : 'paused'}`);
      return;
    }
    
    // Обновляем ссылку на текущее строковое представление
    lastDataStringRef.current = currentDataString;
    
    // Отменяем предыдущий таймаут, если он был
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    console.log('[useAutoSave] Scheduling auto-save in', debounceMs, 'ms');
    
    // Устанавливаем новый таймаут для сохранения
    timeoutRef.current = setTimeout(() => {
      console.log('[useAutoSave] Auto-save triggered');
      saveData(data);
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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