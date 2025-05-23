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
 * @returns Promise с массивом данных слотов из API
 */
export async function fetchAvailableTimeSlotsApi(date: Date) {
  const requestId = Math.random().toString(36).substring(2, 8);
  
  // console.log(`[${requestId}] Начало запроса слотов`);
  
  try {
    resetToken();
    await initAuth();
    // console.log(`[${requestId}] Авторизация успешна`);
  } catch (error) {
    console.error(`[${requestId}] Ошибка авторизации: ${error}`);
    throw error;
  }
  
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
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
    // console.log(`[${requestId}] Запрос слотов на сегодня: ${startDate.toISOString()}`);
  } else {
    startDate.setHours(0, 0, 0, 0);
    // console.log(`[${requestId}] Запрос слотов на дату: ${startDate.toISOString()}`);
  }
  
  const startDateISO = toMoscowISOString(startDate);
  const endDateISO = toMoscowISOString(endDate);
  
  let token = getToken();
  if (!token) {
    try {
      console.log(`[${requestId}] Токен отсутствует, запрашиваем новый`);
      token = await login();
      // console.log(`[${requestId}] Получен новый токен`);
    } catch (error) {
      console.error(`[${requestId}] Ошибка получения токена: ${error}`);
    }
  }
  
  try {
    const fullApiUrl = `${API_BASE_URL}${API_PATH}`;
    // console.log(`[${requestId}] Отправляем запрос на ${fullApiUrl}`);
    
    const params = {
      start: toMoscowISOString(startDate),
      end: toMoscowISOString(endDate),
    };
    
    const response = await api.get('/calendar/available', { params });
    // console.log(`[${requestId}] Получен ответ от сервера: ${response.status}`);
    
    if (response.data && response.data.message && 
       (response.data.message.includes('Unauthorized') || 
        response.data.message.includes('Access denied'))) {
      
      console.error(`[${requestId}] Ошибка авторизации, пробуем получить новый токен`);
      resetToken();
      
      try {
        const newToken = await login();
        
        if (newToken) {
          // console.log(`[${requestId}] Повторный запрос с новым токеном`);
          
          const retryResponse = await api.get('/calendar/available', {
            params: { 
              start: startDateISO, 
              end: endDateISO 
            }
          });
          
          // console.log(`[${requestId}] Успешный повторный запрос`);
          return retryResponse.data.data || [];
        }
      } catch (authError: any) {
        console.error(`[${requestId}] Ошибка при повторном запросе: ${authError}`);
      }
    }
    
    const responseData = response.data;
    // console.log(`[${requestId}] Обработка ответа сервера`);
    
    if (Array.isArray(responseData)) {
      // console.log(`[${requestId}] Получен массив слотов: ${responseData.length}`);
      return responseData;
    } else if (responseData.success && Array.isArray(responseData.data)) {
      // console.log(`[${requestId}] Получены слоты в формате success: ${responseData.data.length}`);
      return responseData.data;
    } else if (responseData.data && Array.isArray(responseData.data.slots)) {
      // console.log(`[${requestId}] Получены слоты в формате data.slots: ${responseData.data.slots.length}`);
      return responseData.data.slots;
    } else if (responseData.slots && Array.isArray(responseData.slots)) {
      // console.log(`[${requestId}] Получены слоты в формате slots: ${responseData.slots.length}`);
      return responseData.slots;
    }
    
    console.warn(`[${requestId}] Нет данных о слотах`);
    return [];
  } catch (error) {
    console.error(`[${requestId}] Ошибка при запросе слотов: ${error}`);
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