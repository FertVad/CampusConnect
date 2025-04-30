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
}

/**
 * Хук для автоматического сохранения данных с дебаунсом
 * @param data Данные для отправки на сервер
 * @param options Опции автосохранения
 */
export function useAutoSave<T>(data: T, options: AutoSaveOptions) {
  const { debounceMs = 1000, url, method = 'POST', onError, onSuccess, enabled = true } = options;
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Сравнение данных чтобы узнать, изменились ли они
  const isDataChanged = (oldData: T | null, newData: T): boolean => {
    if (!oldData) return true;
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  };
  
  // Функция сохранения
  const saveData = async (dataToSave: T) => {
    if (!isDataChanged(lastSavedData, dataToSave)) {
      return; // Данные не изменились, не сохраняем
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
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
      setLastSavedData(dataToSave);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      if (onError) {
        onError(error);
      } else {
        toast({
          title: "Ошибка автосохранения",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  // Принудительное сохранение (для кнопки "Сохранить")
  const forceSave = async () => {
    // Проверяем, разрешено ли автосохранение
    if (!enabled) {
      console.log('[useAutoSave] Force save skipped - disabled');
      return;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    console.log('[useAutoSave] Force saving data');
    await saveData(data);
    
    toast({
      title: "Сохранено",
      description: "Данные успешно сохранены",
      variant: "default",
    });
  };
  
  // Эффект для автоматического сохранения с дебаунсом
  useEffect(() => {
    // Не запускаем автосохранение, если флаг enabled установлен в false
    if (!enabled) {
      return;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    console.log('[useAutoSave] Scheduling auto-save in', debounceMs, 'ms');
    
    timeoutRef.current = setTimeout(() => {
      console.log('[useAutoSave] Auto-saving data', data);
      saveData(data);
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, enabled]);
  
  return {
    isSaving,
    error,
    forceSave,
    lastSavedData
  };
}