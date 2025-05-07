import { useState } from 'react';
import { fetchAvailableTimeSlotsApi } from './calendarApiService';

export function useCalendarApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableTimeSlots = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAvailableTimeSlotsApi(date);
      setLoading(false);
      return data;
    } catch (e: any) {
      setError(e.message || 'Ошибка при получении слотов');
      setLoading(false);
      return [];
    }
  };

  return { fetchAvailableTimeSlots, loading, error };
} 