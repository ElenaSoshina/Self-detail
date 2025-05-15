import api from '../../api/apiService';
import axios, { AxiosError } from 'axios';

const API_PATH = '/calendar/available';

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
  
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();
  
  console.log('Запрашиваем слоты для диапазона:', { 
    startDateISO, 
    endDateISO, 
    isToday 
  });
  
  try {
    // Попытка получить свежий токен перед запросом
    let token = localStorage.getItem('jwt_token');
    console.log('Текущий токен:', token ? `${token.substring(0, 20)}...` : 'отсутствует');
    
    if (!token) {
      console.error('Токен отсутствует при запросе слотов');
      alert('Ошибка: Токен авторизации отсутствует. Обновите страницу для повторной авторизации.');
      throw new Error('Токен авторизации отсутствует');
    }
    
    // Проверяем формат токена
    if (!token.startsWith('eyJ')) {
      console.warn('Токен имеет неправильный формат. Требуется JWT токен.');
      alert('Ошибка: Токен имеет неправильный формат. Обновите страницу.');
      throw new Error('Неверный формат токена');
    }

    // Пробуем два варианта форматов авторизации
    try {
      // Вариант 1: Только токен без Bearer
      console.log('Пробуем отправить запрос с токеном без Bearer');
      const response1 = await api.get(API_PATH, {
        params: { start: startDateISO, end: endDateISO },
        headers: {
          Authorization: token
        }
      });
      
      console.log('Успешный ответ от API слотов с токеном без Bearer:', response1.status);
      return response1.data.data;
    } catch (error1) {
      console.error('Ошибка при первой попытке запроса слотов:', error1);
      
      // Вариант 2: с Bearer
      console.log('Пробуем отправить запрос с Bearer токеном');
      const response2 = await api.get(API_PATH, {
        params: { start: startDateISO, end: endDateISO },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Успешный ответ от API слотов с Bearer токеном:', response2.status);
      return response2.data.data;
    }
  } catch (error: unknown) {
    console.error('Ошибка при запросе слотов:', error);
    
    // Отображаем ошибку от сервера, если она есть
    if (axios.isAxiosError(error) && error.response) {
      console.error('Ответ сервера:', error.response.status, error.response.data);
      alert(`Ошибка сервера: ${error.response.status}\n${JSON.stringify(error.response.data || {})}`);
    }
    
    throw error;
  }
} 