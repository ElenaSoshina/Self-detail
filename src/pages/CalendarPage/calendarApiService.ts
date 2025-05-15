import api from '../../api/apiService';
import axios from 'axios';
import { login, getToken, initAuth, isOfflineMode } from '../../api/apiService';
import { isTelegramWebApp } from '../../utils/env';

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
  const isTelegram = isTelegramWebApp();
  const requestId = Math.random().toString(36).substring(2, 8); // Уникальный ID запроса для логов
  
  // Отображаем алерт в Telegram о начале процесса
  if (isTelegram) {
    alert(`[DEBUG] Начало запроса слотов для даты: ${date.toLocaleDateString()}`);
    
    // Проверка на оффлайн-режим
    if (isOfflineMode()) {
      alert(`[DEBUG] Работаем в оффлайн-режиме. Будут использованы тестовые данные`);
    }
  }
  
  console.log(`[API:${requestId}] Запрос слотов для даты ${date.toLocaleDateString()}`);
  
  // Сначала убедимся, что авторизация выполнена
  try {
    await initAuth();
    if (isTelegram) {
      alert(`[DEBUG] Авторизация успешно выполнена`);
    }
  } catch (error) {
    if (isTelegram) {
      alert(`[DEBUG] Ошибка авторизации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
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
  
  // Формируем ISO-строки уже в московской зоне
  const startDateISO = toMoscowISOString(startDate);
  const endDateISO   = toMoscowISOString(endDate);
  
  console.log('Запрашиваем слоты для диапазона:', { startDateISO, endDateISO, isToday });
  
  // Проверка токена перед запросом
  const token = getToken();
  if (isTelegram) {
    alert(`[DEBUG] Статус токена: ${token ? 'Присутствует' : 'Отсутствует'}`);
  }
  
  try {
    // Показываем параметры запроса в алерте (только в Telegram)
    if (isTelegram) {
      // Используем всегда локальную относительную ссылку
      const apiUrl = `/api/v1${API_PATH}?start=${encodeURIComponent(startDateISO)}&end=${encodeURIComponent(endDateISO)}`;
      alert(`[DEBUG] Отправка запроса:\nURL: ${apiUrl}`);
    }
    
    // Используем экземпляр API, который уже имеет логику добавления токена
    console.log(`[API:${requestId}] Отправляем запрос`);
    console.log(`[API:${requestId}] Параметры запроса:`, { 
      url: API_PATH, 
      start: startDateISO, 
      end: endDateISO,
      token: getToken() ? 'Есть токен' : 'Нет токена'
    });
    
    // Метод отправки запроса зависит от окружения
    let response;
    
    if (isTelegram) {
      // В Telegram WebApp используем axios с полными параметрами
      const fullUrl = import.meta.env.DEV 
        ? `/api/v1${API_PATH}` 
        : `${window.location.origin}/api/v1${API_PATH}`;
      
      response = await axios.get(fullUrl, {
        params: { 
          start: startDateISO, 
          end: endDateISO 
        },
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } else {
      // В обычном режиме используем подготовленный api-клиент
      response = await api.get(API_PATH, {
        params: { start: startDateISO, end: endDateISO }
      });
    }
    
    console.log(`[API:${requestId}] Успешный ответ от API слотов:`, response.status);
    console.log(`[API:${requestId}] Данные ответа:`, response.data);
    
    // Отображаем результат запроса в алерте (только в Telegram)
    if (isTelegram) {
      const responseData = response.data;
      // Проверяем наличие данных в разных форматах ответа
      if (responseData && typeof responseData === 'object') {
        // Определяем структуру ответа API
        let slotsArray;
        if (Array.isArray(responseData)) {
          // Если ответ сразу является массивом
          slotsArray = responseData;
        } else if (responseData.success && Array.isArray(responseData.data)) {
          // Формат: {success: true, data: [...]}
          slotsArray = responseData.data;
        } else if (responseData.data && Array.isArray(responseData.data.slots)) {
          // Формат: {data: {slots: [...]}}
          slotsArray = responseData.data.slots;
        } else if (responseData.slots && Array.isArray(responseData.slots)) {
          // Формат: {slots: [...]}
          slotsArray = responseData.slots;
        } else {
          // Не нашли массив - создаем пустой
          slotsArray = [];
        }
        
        const slotsCount = slotsArray.length;
        alert(`[DEBUG] Успешный ответ от API слотов!\nСтатус: ${response.status}\nКоличество слотов: ${slotsCount}`);
        
        // Выводим дополнительную информацию о структуре ответа
        const responseStructure = JSON.stringify(responseData, null, 2).substring(0, 100);
        alert(`[DEBUG] Структура ответа: ${responseStructure}...`);
        
        // Возвращаем найденный массив слотов
        return slotsArray;
      } else {
        alert(`[DEBUG] Успешный ответ от API слотов!\nСтатус: ${response.status}\nКоличество слотов: 0`);
        return [];
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
      return responseData.data;
    } else if (responseData.data && Array.isArray(responseData.data.slots)) {
      // Формат: {data: {slots: [...]}}
      return responseData.data.slots;
    } else if (responseData.slots && Array.isArray(responseData.slots)) {
      // Формат: {slots: [...]}
      return responseData.slots;
    }
    
    // Если не нашли массив, выводим в консоль структуру и возвращаем пустой массив
    console.warn('Не удалось найти массив слотов в ответе:', responseData);
    return [];
  } catch (error) {
    console.error('Ошибка при запросе слотов:', error);
    
    // Отображаем детали ошибки в алерте (только в Telegram)
    if (isTelegram && axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 'нет статуса';
      const errorData = JSON.stringify(error.response?.data || {});
      alert(`[DEBUG] Ошибка запроса слотов!\nСтатус: ${statusCode}\nДанные: ${errorData}`);
    }
    
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
    console.error('Данные слотов не являются массивом:', slotsData);
    
    // Возвращаем пустые массивы при некорректных данных
    return {
      formattedTimeSlots: [],
      timeSlotsWithData: []
    };
  }
  
  // Фильтруем только доступные слоты
  const availableSlots = slotsData.filter(slot => slot.available !== false);
  
  // Отображаем информацию о количестве доступных слотов (только в Telegram)
  if (isTelegramWebApp()) {
    alert(`[DEBUG] Форматирование данных:\nВсего слотов: ${slotsData.length}\nДоступных слотов: ${availableSlots.length}`);
  }
  
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