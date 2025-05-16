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
  const requestId = Math.random().toString(36).substring(2, 8); // Уникальный ID запроса для логов
  
  // Сначала убедимся, что авторизация выполнена
  try {
    // Сбросим токен перед повторной инициализацией, чтобы избежать использования поврежденного токена
    resetToken();
    await initAuth();
  } catch (error) {
    throw error;
  }
  
  // Проверяем, является ли запрашиваемая дата текущим днем
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  // Создаем даты для диапазона запроса
  const startDate = new Date(date);
  
  // Создаем дату для следующего дня (00:00:00)
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(0, 0, 0, 0);
  
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
  
  // Формируем ISO-строки для запроса
  const startDateISO = toMoscowISOString(startDate);
  const endDateISO = toMoscowISOString(endDate);
  
  console.log('Запрашиваем слоты для диапазона:', { startDateISO, endDateISO, isToday });
  
  // Проверяем токен и обновляем при необходимости
  let token = getToken();
  if (!token) {
    try {
      console.log(`[API:${requestId}] Токен отсутствует, запрашиваем новый`);
      token = await login();
      console.log(`[API:${requestId}] Получен новый токен:`, token ? `${token.substring(0, 10)}...` : 'ошибка');
    } catch (error) {
      console.error(`[API:${requestId}] Ошибка получения токена:`, error);
    }
  }
  
  // Выводим токен в консоль для проверки
  console.log(`[API:${requestId}] Токен авторизации:`, token ? `Bearer ${token.substring(0, 10)}... (${token.length} символов)` : 'отсутствует');
  
  try {
    // Получаем полный URL запроса
    const fullApiUrl = `${API_BASE_URL}${API_PATH}`;
    
    // Используем экземпляр API, который уже имеет логику добавления токена
    console.log(`[API:${requestId}] Отправляем запрос`);
    console.log(`[API:${requestId}] Параметры запроса:`, { 
      url: fullApiUrl, 
      start: startDateISO, 
      end: endDateISO,
      token: getToken() ? 'Есть токен' : 'Нет токена'
    });
    
    // Используем axios напрямую с полным URL
    // Проверяем, начинается ли токен уже с Bearer, чтобы избежать дублирования
    const tokenValue = token && token.startsWith('Bearer ') ? token : (token ? `Bearer ${token}` : '');
    console.log(`[API:${requestId}] Используемый заголовок Authorization:`, tokenValue);
    

    const params = {
      start: toMoscowISOString(startDate),
      end: toMoscowISOString(endDate),
    };

    
    const response = await api.get('/calendar/available', { params });
    
    
    console.log(`[API:${requestId}] Успешный ответ от API слотов:`, response.status);
    console.log(`[API:${requestId}] Данные ответа:`, response.data);
    
    // Проверяем на сообщения об ошибках авторизации в ответе
    if (response.data && response.data.message && 
       (response.data.message.includes('Unauthorized') || 
        response.data.message.includes('Access denied'))) {
      
      console.error(`[API:${requestId}] Сервер вернул ошибку авторизации:`, response.data.message);
      
      
      // Сбрасываем токен и пробуем получить новый
      // Полностью сбрасываем авторизацию, а не только удаляем токен из localStorage
      resetToken();
      try {
        const newToken = await login();
        
        // Повторяем запрос с новым токеном
        if (newToken) {
          console.log(`[API:${requestId}] Повторный запрос с новым токеном`);
          
          const retryResponse = await api.get('/calendar/available', {
            params: { 
              start: startDateISO, 
              end: endDateISO 
            }
          });
          
          console.log(`[API:${requestId}] Результат повторного запроса:`, retryResponse.status);
          // Используем ответ от повторного запроса
          return retryResponse.data.data || [];
        }
      } catch (authError: any) {

      }
    }

    
    // Обрабатываем ответ API для всех окружений
    const responseData = response.data;
    
    // Определяем структуру ответа API
    if (Array.isArray(responseData)) {
      // Если ответ сразу является массивом
      return responseData;
    } else if (responseData.success && Array.isArray(responseData.data)) {
      // Формат: {success: true, data: [...]}
      console.log(`[API:${requestId}] Возвращаем массив ${responseData.data.length} слотов`);
      return responseData.data;
    } else if (responseData.data && Array.isArray(responseData.data.slots)) {
      // Формат: {data: {slots: [...]}}
      return responseData.data.slots;
    } else if (responseData.slots && Array.isArray(responseData.slots)) {
      // Формат: {slots: [...]}
      return responseData.slots;
    }
    
    return [];
  } catch (error) {
    console.error('Ошибка при запросе слотов:', error);
    
    // В случае ошибок перебрасываем их дальше
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
  
  // Фильтруем только доступные слоты
  const availableSlots = slotsData.filter(slot => slot.available !== false);
  
  
  // Форматируем каждый слот
  const timeSlotsWithData: TimeSlotData[] = availableSlots.map(slot => {
    // Выводим информацию о дате из слота
    console.log('Форматирование слота:', { 
      originalStartTime: slot.start,
      parsedTime: new Date(slot.start)
    });
    
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