import api from '../../api/apiService';
import axios from 'axios';

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
  
  console.log('Запрашиваем слоты для диапазона:', { startDateISO, endDateISO, isToday });
  
  try {
    // Получаем токен из хранилища
    const token = localStorage.getItem('jwt_token');
    
    if (!token) {
      console.error('Токен отсутствует при запросе слотов');
      throw new Error('Токен авторизации отсутствует');
    }

    // Показываем данные запроса в алерте
    const apiUrl = `https://backend.self-detailing.duckdns.org/api/v1${API_PATH}?start=${encodeURIComponent(startDateISO)}&end=${encodeURIComponent(endDateISO)}`;
    
    alert(`ДАННЫЕ ЗАПРОСА СЛОТОВ:\n\nURL: ${apiUrl}\n\nТокен: ${token.substring(0, 30)}...\n\nЗаголовок: Authorization: ${token}`);
    
    // Выполняем запрос с токеном без Bearer
    console.log('Отправляем запрос с токеном без Bearer');
    const response = await api.get(API_PATH, {
      params: { start: startDateISO, end: endDateISO },
      headers: {
        Authorization: token
      }
    });
    
    console.log('Успешный ответ от API слотов:', response.status);
    alert(`Успешный ответ от API слотов!\nСтатус: ${response.status}\nКоличество слотов: ${response.data.data?.length || 0}`);
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
        
        // Показываем данные запроса в алерте для варианта с Bearer
        const apiUrl = `https://backend.self-detailing.duckdns.org/api/v1${API_PATH}?start=${encodeURIComponent(startDateISO)}&end=${encodeURIComponent(endDateISO)}`;
        
        alert(`ПОВТОРНАЯ ПОПЫТКА С BEARER:\n\nURL: ${apiUrl}\n\nТокен: ${token.substring(0, 30)}...\n\nЗаголовок: Authorization: Bearer ${token}`);
        
        console.log('Пробуем с префиксом Bearer');
        const response = await api.get(API_PATH, {
          params: { start: startDateISO, end: endDateISO },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Успешный ответ с Bearer токеном:', response.status);
        alert(`Успешный ответ от API слотов с Bearer!\nСтатус: ${response.status}\nКоличество слотов: ${response.data.data?.length || 0}`);
        return response.data.data;
      } catch (bearerError) {
        console.error('Ошибка и при использовании Bearer:', bearerError);
        
        // Показываем детали ошибки
        if (axios.isAxiosError(bearerError) && bearerError.response) {
          alert(`Ошибка запроса с Bearer:\nСтатус: ${bearerError.response.status}\nДанные: ${JSON.stringify(bearerError.response.data || {})}`);
        }
      }
    }
    
    // Показываем детали ошибки
    if (axios.isAxiosError(error) && error.response) {
      alert(`Ошибка запроса без Bearer:\nСтатус: ${error.response.status}\nДанные: ${JSON.stringify(error.response.data || {})}`);
    }
    
    throw error;
  }
} 