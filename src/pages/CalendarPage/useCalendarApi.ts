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
  const getDateKey = (date: Date, excludeBookingId?: number | string): string => {
    const baseKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return excludeBookingId ? `${baseKey}-exclude-${excludeBookingId}` : baseKey;
  };

  /**
   * Получение и форматирование доступных временных слотов с кешированием
   * @param date Дата для запроса слотов
   * @param excludeBookingId ID бронирования, которое нужно исключить (для редактирования)
   * @returns Форматированные данные слотов
   */
  const fetchAvailableTimeSlots = useCallback(async (date: Date, excludeBookingId?: number | string): Promise<CalendarApiResult> => {
    const dateKey = getDateKey(date, excludeBookingId);
    const now = Date.now();
    
    // console.log(`[Cache] Проверка кеша для даты ${dateKey}`);
    
    const cachedResult = requestCache.current[dateKey];
    if (cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
      // console.log(`[Cache] Используем кешированные данные для ${dateKey}`);
      
      // Дополнительная обработка для текущего дня - фильтруем слоты, которые уже прошли
      if (date.toDateString() === new Date().toDateString()) {
        const filteredResult = filterPastSlots(cachedResult.data);
        return filteredResult;
      }
      
      return cachedResult.data;
    }
    
    if (dateKey in pendingRequests.current) {
      // console.log(`[Cache] Используем существующий запрос для ${dateKey}`);
      const result = await pendingRequests.current[dateKey];
      
      // Дополнительная обработка для текущего дня
      if (date.toDateString() === new Date().toDateString()) {
        return filterPastSlots(result);
      }
      
      return result;
    }
    
    setLoading(true);
    setError(null);
    
    // console.log(`[Cache] Создаем новый запрос для ${dateKey}`);
    
    const requestPromise = (async () => {
      try {
        const slots = await fetchAvailableTimeSlotsApi(date, excludeBookingId);
        let formattedData = formatTimeSlots(slots);
        
        // Если это текущий день, фильтруем прошедшие слоты
        if (date.toDateString() === new Date().toDateString()) {
          formattedData = filterPastSlots(formattedData);
        }
        
        requestCache.current[dateKey] = {
          data: formattedData,
          timestamp: Date.now()
        };
        
        // console.log(`[Cache] Данные сохранены в кеш для ${dateKey}`);
        setLoading(false);
        return formattedData;
      } catch (e: any) {
        const errorMessage = e.message || 'Ошибка при получении слотов';
        console.error(`[Cache] Ошибка запроса: ${errorMessage}`);
        setError(errorMessage);
        setLoading(false);
        
        return {
          formattedTimeSlots: [],
          timeSlotsWithData: []
        };
      } finally {
        delete pendingRequests.current[dateKey];
        // console.log(`[Cache] Запрос удален из активных для ${dateKey}`);
      }
    })();
    
    pendingRequests.current[dateKey] = requestPromise;
    
    return requestPromise;
  }, []);
  
  // Функция для фильтрации прошедших слотов
  const filterPastSlots = (result: CalendarApiResult): CalendarApiResult => {
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 минут буфера
    
    const filteredTimeSlots = result.timeSlotsWithData.filter(slot => {
      return slot.start.getTime() > (now.getTime() + buffer);
    });
    
    return {
      formattedTimeSlots: filteredTimeSlots.map(slot => slot.formattedTime),
      timeSlotsWithData: filteredTimeSlots
    };
  };

  // Функция для принудительной очистки кеша
  const clearCache = useCallback(() => {
    requestCache.current = {};
    // console.log('[Cache] Кеш запросов очищен');
  }, []);

  return { fetchAvailableTimeSlots, loading, error, clearCache };
} 