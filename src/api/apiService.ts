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
  timeout: 10000,
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
    let token = getToken();
    
    // Если токена нет, пытаемся авторизоваться
    if (!token) {
      try {
        token = await login();
      } catch (error) {
        console.error('Не удалось авторизоваться автоматически:', error);
      }
    }
    
    // Добавляем токен к заголовкам
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
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

// При импорте модуля сразу выполняем авторизацию
login().catch(error => {
  console.error('Ошибка начальной авторизации:', error);
});

export default api; 