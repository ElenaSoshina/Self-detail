import api from '../../api/apiService';

const API_PATH = '/calendar/available';

export async function fetchAvailableTimeSlotsApi(date: Date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();
  
  console.log('Запрашиваем слоты для диапазона:', { startDateISO, endDateISO });
  
  try {
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('jwt_token');
    console.log('Токен перед запросом слотов:', token ? `${token.substring(0, 20)}...` : 'отсутствует');
    
    const response = await api.get(API_PATH, {
      params: { start: startDateISO, end: endDateISO }
    });
    
    console.log('Получен ответ от API слотов:', response.status, response.data);
    return response.data.data;
  } catch (error) {
    console.error('Ошибка при запросе слотов:', error);
    throw error;
  }
} 