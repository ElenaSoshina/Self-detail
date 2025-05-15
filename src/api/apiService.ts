import axios from 'axios';
import { getBackendUsername, getBackendPassword } from '../utils/env';

const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 20000, // Увеличиваем таймаут до 20 секунд
});

// Функция для авторизации и получения токена
export const login = async () => {
  try {
    const username = getBackendUsername();
    const password = getBackendPassword();
    
    // Добавляем алерт для проверки учетных данных
    alert(`Попытка авторизации:\nИмя пользователя: ${username ? 'Получено' : 'Отсутствует'}\nПароль: ${password ? 'Получен' : 'Отсутствует'}`);
    
    if (!username || !password) {
      console.error('Учетные данные не найдены в переменных окружения');
      alert('Ошибка: Учетные данные не найдены в переменных окружения');
      throw new Error('Учетные данные не найдены в переменных окружения');
    }
    
    // Алерт перед отправкой запроса
    alert(`Отправка запроса на ${API_URL}/auth/login с данными:\nusername: ${username}\npassword: ${password.substring(0, 3)}...`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password
    });
    
    // Выводим структуру ответа для диагностики
    console.log('Структура ответа:', JSON.stringify(response.data, null, 2));
    alert(`Структура ответа: ${JSON.stringify(response.data, null, 2)}`);
    
    // Алерт с информацией об ответе
    alert(`Ответ от сервера:\nСтатус: ${response.status}\nУспех: ${response.data?.success ? 'Да' : 'Нет'}\nСообщение: ${response.data?.message || 'Нет сообщения'}`);
    
    // Извлечение токена из нового формата ответа
    if (response.data?.success && response.data?.data?.token) {
      // Сохраняем токен
      localStorage.setItem('jwt_token', response.data.data.token);
      return response.data.data.token;
    } else if (response.data && response.data.token) {
      // Для обратной совместимости со старым форматом
      localStorage.setItem('jwt_token', response.data.token);
      return response.data.token;
    }
    
    alert('Ошибка: Не удалось получить токен из ответа сервера');
    throw new Error('Не удалось получить токен');
  } catch (error) {
    // Расширенный вывод информации об ошибке
    if (axios.isAxiosError(error)) {
      const errorMessage = `Ошибка авторизации (${error.code}): ${error.message}\nСтатус: ${error.response?.status}\nДанные: ${JSON.stringify(error.response?.data || {})}`;
      console.error(errorMessage);
      alert(errorMessage);
    } else {
    console.error('Ошибка авторизации:', error);
      alert(`Ошибка авторизации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
    throw error;
  }
};

// Получение токена из хранилища
export const getToken = () => {
  return localStorage.getItem('jwt_token');
};

// Перехватчик запросов для добавления токена
api.interceptors.request.use(
  async (config) => {
    // Добавляем информацию об URL запроса для отладки
    console.log(`Отправка запроса на ${config.url}`);
    
    // Пропускаем добавление токена для запроса авторизации
    if (config.url && config.url.includes('/auth/login')) {
      console.log('Запрос авторизации, пропускаем добавление токена');
      return config;
    }
    
    let token = getToken();
    console.log('Токен из хранилища:', token ? `${token.substring(0, 20)}...` : 'отсутствует');
    
    // Если токена нет, пытаемся авторизоваться
    if (!token) {
      try {
        console.log('Токен не найден, выполняем авторизацию...');
        token = await login();
        console.log('Получен новый токен:', token ? `${token.substring(0, 20)}...` : 'не получен');
      } catch (error) {
        console.error('Не удалось авторизоваться автоматически:', error);
      }
    }
    
    // Проверяем и добавляем токен
    if (token) {
      // Если в запросе уже установлены заголовки авторизации - не перезаписываем их
      if (config.headers.Authorization) {
        console.log('Заголовок Authorization уже установлен:', config.headers.Authorization);
      } else {
        // Для запросов слотов пробуем без Bearer
        if (config.url && config.url.includes('available')) {
          config.headers.Authorization = token;
          console.log('Заголовок Authorization (без Bearer):', token.substring(0, 20) + '...');
        } else {
          // Для остальных запросов добавляем с Bearer
      config.headers.Authorization = `Bearer ${token}`;
          console.log('Заголовок Authorization (с Bearer):', `Bearer ${token.substring(0, 20)}...`);
        }
      }
    } else {
      console.warn('Токен не добавлен к заголовкам, запрос будет отправлен без авторизации');
    }
    
    return config;
  },
  (error) => {
    console.error('Ошибка в перехватчике запросов:', error);
    return Promise.reject(error);
  }
);

// Перехватчик ответов для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Если ошибка 401 (неавторизован) и запрос не повторялся ранее
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Сначала удаляем старый токен
        localStorage.removeItem('jwt_token');
        
        // Получаем новый токен
        const token = await login();
        
        // Обновляем заголовок в текущем запросе
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Повторяем запрос
        return axios(originalRequest);
      } catch (loginError) {
        console.error('Ошибка при повторной авторизации:', loginError);
        return Promise.reject(loginError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 