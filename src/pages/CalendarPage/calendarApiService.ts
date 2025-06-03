import api from '../../api/apiService';
import { login, getToken, initAuth, resetToken } from '../../api/apiService';


// Используем относительный URL API
const API_BASE_URL = '/api/v1';
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
  // Форматируем дату в формат ISO без указания часового пояса, как ожидает API
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  // Формат YYYY-MM-DDTHH:MM:SS (без миллисекунд и часового пояса)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Получение доступных временных слотов от API
 * @param date Дата для запроса слотов
 * @param excludeBookingId ID бронирования, которое нужно исключить (для редактирования)
 * @returns Promise с массивом данных слотов из API
 */
export async function fetchAvailableTimeSlotsApi(date: Date, excludeBookingId?: number | string) {
  const requestId = Math.random().toString(36).substring(2, 8);
  
  try {
    resetToken();
    await initAuth();
  } catch (error) {
    console.error(`[${requestId}] Ошибка авторизации: ${error}`);
    throw error;
  }
  
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  // Если это сегодняшний день и время уже позднее 22:00, возвращаем пустой массив
  if (isToday && now.getHours() >= 22) {
    return [];
  }
  
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(0, 0, 0, 0);
  
  if (isToday) {
    // Для сегодняшнего дня начинаем с текущего времени + запас в 5 минут
    const currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() + 5);
    startDate.setHours(
      currentTime.getHours(),
      currentTime.getMinutes(),
      currentTime.getSeconds(),
      currentTime.getMilliseconds()
    );
  } else {
    startDate.setHours(0, 0, 0, 0);
  }
  
  const startDateISO = toMoscowISOString(startDate);
  const endDateISO = toMoscowISOString(endDate);
  
  let token = getToken();
  if (!token) {
    try {
      token = await login();
    } catch (error) {
      console.error(`[${requestId}] Ошибка получения токена: ${error}`);
    }
  }
  
  try {
    const fullApiUrl = `${API_BASE_URL}${API_PATH}`;
    
    const params: any = {
      start: toMoscowISOString(startDate),
      end: toMoscowISOString(endDate),
    };
    
    // Добавляем excludeBookingId если передан
    if (excludeBookingId) {
      params.excludeBookingId = excludeBookingId;
    }
    
    const response = await api.get('/calendar/available', { params });
    
    if (response.data && response.data.message && 
       (response.data.message.includes('Unauthorized') || 
        response.data.message.includes('Access denied'))) {
      
      console.error(`[${requestId}] Ошибка авторизации, пробуем получить новый токен`);
      resetToken();
      
      try {
        const newToken = await login();
        
        if (newToken) {
          const retryParams: any = { 
            start: startDateISO, 
            end: endDateISO 
          };
          
          if (excludeBookingId) {
            retryParams.excludeBookingId = excludeBookingId;
          }
          
          const retryResponse = await api.get('/calendar/available', {
            params: retryParams
          });
          
          return retryResponse.data.data || [];
        }
      } catch (authError: any) {
        console.error(`[${requestId}] Ошибка при повторном запросе: ${authError}`);
      }
    }
    
    const responseData = response.data;
    
    if (Array.isArray(responseData)) {
      return responseData;
    } else if (responseData.success && Array.isArray(responseData.data)) {
      return responseData.data;
    } else if (responseData.data && Array.isArray(responseData.data.slots)) {
      return responseData.data.slots;
    } else if (responseData.slots && Array.isArray(responseData.slots)) {
      return responseData.slots;
    }
    
    return [];
  } catch (error: any) {
    // Если ошибка 400 и это сегодняшний день, вероятно запрашиваем время в прошлом
    if (error.response?.status === 400 && isToday) {
      return [];
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
    
    // Возвращаем пустые массивы при некорректных данных
    return {
      formattedTimeSlots: [],
      timeSlotsWithData: []
    };
  }
  
  // Создаем массив всех часов (0-23)
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  
  // Создаем карту имеющихся в API слотов
  const apiSlotsByHour = new Map();
  
  // Фильтруем только доступные слоты и добавляем в карту
  slotsData.forEach(slot => {
    if (slot.available !== false) {
      const slotTime = new Date(slot.start);
      const hour = slotTime.getHours();
      apiSlotsByHour.set(hour, slot);
    }
  });
  
  // Дополнительно фильтруем по текущему времени для текущего дня
  const now = new Date();
  const filteredSlots = Array.from(apiSlotsByHour.entries())
    .filter(([hour, slot]) => {
      const slotTime = new Date(slot.start);
      const isToday = slotTime.toDateString() === now.toDateString();
      
      // Если сегодня, то проверяем, что слот еще не прошел (с буфером в 5 минут)
      if (isToday) {
        const buffer = 5 * 60 * 1000; // 5 минут в миллисекундах
        return slotTime.getTime() > (now.getTime() + buffer);
      }
      
      return true;
    })
    .map(([hour, slot]) => slot);
  
  // Форматируем каждый слот
  const timeSlotsWithData: TimeSlotData[] = filteredSlots.map(slot => {
    const slotTime = new Date(slot.start);
    const hours = slotTime.getHours();
    const minutes = slotTime.getMinutes();
    
    return {
      formattedTime: `${hours < 10 ? '0' + hours : hours}:${minutes === 0 ? '00' : minutes < 10 ? '0' + minutes : minutes}`,
      originalData: slot,
      sortKey: hours * 60 + minutes,
      start: slotTime,
      end: new Date(slot.end), // Используем только оригинальное время окончания
      available: true
    };
  });
  
  // Если нет доступных слотов, логируем предупреждение
  if (timeSlotsWithData.length === 0) {
    console.warn('Нет доступных слотов в этот день');
  }
  
  // Сортируем слоты по времени
  timeSlotsWithData.sort((a, b) => a.sortKey - b.sortKey);
  
  // Извлекаем отформатированное время для простого отображения
  const formattedTimeSlots = timeSlotsWithData.map(slot => slot.formattedTime);
  
  return {
    formattedTimeSlots,
    timeSlotsWithData
  };
} 