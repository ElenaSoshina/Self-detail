import api from '../../api/apiService';
import axios from 'axios';

const API_PATH = '/calendar/available';

export interface TimeSlotData {
  formattedTime: string;
  originalData: any;
  sortKey: number;
  start: Date;
  end: Date;
  available: boolean;
}

function toMoscowISOString(date: Date): string {
  const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;           // 3 ч в миллисекундах
  const moscowDate       = new Date(date.getTime() + MOSCOW_OFFSET_MS);
  return moscowDate.toISOString().replace('Z', '+03:00'); // → 2025-05-15T14:20:00.000+03:00
}

/**
 * Получение доступных временных слотов от API
 * @param date Дата для запроса слотов
 * @returns Promise с массивом данных слотов из API
 */
export async function fetchAvailableTimeSlotsApi(date: Date) {
  // Проверяем, является ли запрашиваемая дата текущим днем
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  // Создаем даты для диапазона запроса
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  // Если это сегодняшний день, устанавливаем startDate на текущее время + 2 минуты
  if (isToday) {
    const currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() + 2);
    startDate.setHours(
      currentTime.getHours(),
      currentTime.getMinutes(),
      currentTime.getSeconds(),
      currentTime.getMilliseconds()
    );
    console.log('Запрос слотов на сегодня: используем текущее время + 2 минуты');
  } else {
    // Для других дней используем начало дня
    startDate.setHours(0, 0, 0, 0);
  }
  
  // Формируем ISO-строки уже в московской зоне
  const startDateISO = toMoscowISOString(startDate);
  const endDateISO   = toMoscowISOString(endDate);
  
  console.log('Запрашиваем слоты для диапазона:', { startDateISO, endDateISO, isToday });
  
  try {
    // Получаем токен из хранилища
    const token = localStorage.getItem('jwt_token');
    
    if (!token) {
      console.error('Токен отсутствует при запросе слотов');
      throw new Error('Токен авторизации отсутствует');
    }

    // Выполняем запрос с токеном без Bearer
    console.log('Отправляем запрос с токеном');
    const response = await api.get(API_PATH, {
      params: { start: startDateISO, end: endDateISO },
      headers: {
        Authorization: token
      }
    });
    
    console.log('Успешный ответ от API слотов:', response.status);
    return response.data.data;
  } catch (error) {
    console.error('Ошибка при запросе слотов:', error);
    
    // Если получили ошибку, пробуем с Bearer
    if (axios.isAxiosError(error)) {
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('Токен отсутствует');
        }
        
        console.log('Пробуем с префиксом Bearer');
        const response = await api.get(API_PATH, {
          params: { start: startDateISO, end: endDateISO },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Успешный ответ с Bearer токеном:', response.status);
        return response.data.data;
      } catch (bearerError) {
        console.error('Ошибка и при использовании Bearer:', bearerError);
      }
    }
    
    throw error;
  }
}

/**
 * Функция для форматирования временных слотов в удобный формат
 * @param slotsData Данные слотов из API
 * @returns Отформатированные слоты и дополнительная информация
 */
export function formatTimeSlots(slotsData: any[]) {
  if (!Array.isArray(slotsData)) {
    console.error('Данные слотов не являются массивом:', slotsData);
    return {
      formattedTimeSlots: [],
      timeSlotsWithData: []
    };
  }
  
  // Фильтруем только доступные слоты
  const availableSlots = slotsData.filter(slot => slot.available);
  
  // Форматируем каждый слот
  const timeSlotsWithData: TimeSlotData[] = availableSlots.map(slot => {
    const slotTime = new Date(slot.start);
    const hours = slotTime.getHours();
    const minutes = slotTime.getMinutes();
    
    return {
      formattedTime: `${hours < 10 ? '0' + hours : hours}:${minutes === 0 ? '00' : minutes < 10 ? '0' + minutes : minutes}`,
      originalData: slot,
      sortKey: hours * 60 + minutes,
      start: slotTime,
      end: new Date(slot.end),
      available: slot.available
    };
  });
  
  // Сортируем слоты по времени
  timeSlotsWithData.sort((a, b) => a.sortKey - b.sortKey);
  
  // Извлекаем отформатированное время для простого отображения
  const formattedTimeSlots = timeSlotsWithData.map(slot => slot.formattedTime);
  
  return {
    formattedTimeSlots,
    timeSlotsWithData
  };
} 