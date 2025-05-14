import { useState } from 'react';
import { fetchAvailableTimeSlotsApi } from './calendarApiService';
import api from '../../api/apiService';

export function useCalendarApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableTimeSlots = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      // Формируем start и end вручную в локальном времени
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const start = `${year}-${month}-${day}T00:00:00`;
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextYear = nextDay.getFullYear();
      const nextMonth = (nextDay.getMonth() + 1).toString().padStart(2, '0');
      const nextDayNum = nextDay.getDate().toString().padStart(2, '0');
      const end = `${nextYear}-${nextMonth}-${nextDayNum}T00:00:00`;
      
      // Используем api вместо axios для добавления токена
      const response = await api.get('/calendar/available', {
        params: { start, end },
      });
      
      setLoading(false);
      return response.data.data;
    } catch (e: any) {
      setError(e.message || 'Ошибка при получении слотов');
      setLoading(false);
      return [];
    }
  };

  return { fetchAvailableTimeSlots, loading, error };
} 