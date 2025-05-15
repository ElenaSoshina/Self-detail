import { useState, useRef, useCallback } from 'react';
import { fetchAvailableTimeSlotsApi, formatTimeSlots, TimeSlotData } from './calendarApiService';

export interface CalendarApiResult {
  formattedTimeSlots: string[];
  timeSlotsWithData: TimeSlotData[];
}

// Тип для кэша запросов
interface RequestCache {
  [key: string]: {
    data: CalendarApiResult;
    timestamp: number;
  }
}

// Продолжительность кеша в миллисекундах (5 минут)
const CACHE_DURATION = 5 * 60 * 1000;

export function useCalendarApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Референс для хранения кеша запросов
  const requestCache = useRef<RequestCache>({});
  
  // Референс для отслеживания запросов в процессе
  const pendingRequests = useRef<{[key: string]: Promise<CalendarApiResult>}>({});
  
  // Форматирование даты для использования в качестве ключа кеша
  const getDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  /**
   * Получение и форматирование доступных временных слотов с кешированием
   * @param date Дата для запроса слотов
   * @returns Форматированные данные слотов
   */
  const fetchAvailableTimeSlots = useCallback(async (date: Date): Promise<CalendarApiResult> => {
    const dateKey = getDateKey(date);
    const now = Date.now();
    
    // Проверяем кеш
    const cachedResult = requestCache.current[dateKey];
    if (cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
      console.log(`[API] Используем кешированные данные для ${dateKey}`);
      return cachedResult.data;
    }
    
    // Проверяем, есть ли уже запрос в процессе для этой даты
    if (dateKey in pendingRequests.current) {
      console.log(`[API] Используем существующий запрос для ${dateKey}`);
      return pendingRequests.current[dateKey];
    }
    
    // Создаем новый запрос
    setLoading(true);
    setError(null);
    
    // Сохраняем промис в списке активных запросов
    const requestPromise = (async () => {
      try {
        // Получаем сырые данные от API
        const slots = await fetchAvailableTimeSlotsApi(date);
        
        // Форматируем полученные данные
        const formattedData = formatTimeSlots(slots);
        
        // Сохраняем результат в кеше
        requestCache.current[dateKey] = {
          data: formattedData,
          timestamp: Date.now()
        };
        
        setLoading(false);
        return formattedData;
      } catch (e: any) {
        const errorMessage = e.message || 'Ошибка при получении слотов';
        console.error(errorMessage, e);
        setError(errorMessage);
        setLoading(false);
        
        // Возвращаем пустые данные при ошибке
        return {
          formattedTimeSlots: [],
          timeSlotsWithData: []
        };
      } finally {
        // Удаляем запрос из списка активных
        delete pendingRequests.current[dateKey];
      }
    })();
    
    // Сохраняем промис в список активных запросов
    pendingRequests.current[dateKey] = requestPromise;
    
    return requestPromise;
  }, []);

  // Функция для принудительной очистки кеша
  const clearCache = useCallback(() => {
    requestCache.current = {};
    console.log('[API] Кеш запросов очищен');
  }, []);

  return { fetchAvailableTimeSlots, loading, error, clearCache };
} 