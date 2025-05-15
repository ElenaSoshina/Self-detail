import { useState } from 'react';
import { fetchAvailableTimeSlotsApi, formatTimeSlots, TimeSlotData } from './calendarApiService';

export interface CalendarApiResult {
  formattedTimeSlots: string[];
  timeSlotsWithData: TimeSlotData[];
}

export function useCalendarApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Получение и форматирование доступных временных слотов
   * @param date Дата для запроса слотов
   * @returns Форматированные данные слотов
   */
  const fetchAvailableTimeSlots = async (date: Date): Promise<CalendarApiResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Получаем сырые данные от API
      const slots = await fetchAvailableTimeSlotsApi(date);
      
      // Форматируем полученные данные
      const formattedData = formatTimeSlots(slots);
      
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
    }
  };

  return { fetchAvailableTimeSlots, loading, error };
} 