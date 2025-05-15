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

// Переменная для отслеживания выполнения запроса токена
let tokenPromise: Promise<string> | null = null;

// Функция для авторизации и получения токена
export const login = async (): Promise<string> => {
  // Если запрос за токеном уже выполняется, возвращаем его результат
  if (tokenPromise) {
    return tokenPromise;
  }
  
  // Создаем новый промис для получения токена
  tokenPromise = (async () => {
    try {
      // Сначала проверяем, есть ли уже токен в localStorage
      const existingToken = localStorage.getItem('jwt_token');
      if (existingToken) {
        console.log('Используем существующий токен из localStorage');
        return existingToken;
      }
      
      const username = getBackendUsername();
      const password = getBackendPassword();
      
      if (!username || !password) {
        console.error('Учетные данные не найдены в переменных окружения');
        throw new Error('Учетные данные не найдены в переменных окружения');
      }
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });
      
      // Извлечение токена из ответа
      if (response.data?.success && response.data?.data?.token) {
        // Сохраняем токен
        localStorage.setItem('jwt_token', response.data.data.token);
        return response.data.data.token;
      } else if (response.data && response.data.token) {
        // Для обратной совместимости со старым форматом
        localStorage.setItem('jwt_token', response.data.token);
        return response.data.token;
      }
      
      throw new Error('Не удалось получить токен');
    } catch (error) {
      // Сбрасываем промис при ошибке, чтобы можно было повторить запрос
      tokenPromise = null;
      
      // Расширенный вывод информации об ошибке
      if (axios.isAxiosError(error)) {
        const errorMessage = `Ошибка авторизации (${error.code}): ${error.message}`;
        console.error(errorMessage);
      } else {
        console.error('Ошибка авторизации:', error);
      }
      throw error;
    }
  })();
  
  try {
    // Ожидаем результат промиса
    return await tokenPromise;
  } catch (error) {
    // Сбрасываем промис при ошибке
    tokenPromise = null;
    throw error;
  }
};

// Получение токена из хранилища
export const getToken = () => {
  return localStorage.getItem('jwt_token');
};

// Функция сброса токена (для выхода или при ошибках)
export const resetToken = () => {
  localStorage.removeItem('jwt_token');
  tokenPromise = null;
};

// Перехватчик запросов для добавления токена
api.interceptors.request.use(
  async (config) => {
    // Пропускаем добавление токена для запроса авторизации
    if (config.url && config.url.includes('/auth/login')) {
      return config;
    }
    
    let token = getToken();
    
    // Если токена нет, пытаемся авторизоваться
    if (!token) {
      try {
        token = await login();
      } catch (error) {
        console.error('Не удалось авторизоваться автоматически:', error);
      }
    }
    
    // Проверяем и добавляем токен
    if (token) {
      // Если в запросе уже установлены заголовки авторизации - не перезаписываем их
      if (config.headers.Authorization) {
        console.log('Заголовок Authorization уже установлен');
      } else {
        // Для запросов слотов пробуем без Bearer
        if (config.url && config.url.includes('available')) {
          config.headers.Authorization = token;
        } else {
          // Для остальных запросов добавляем с Bearer
          config.headers.Authorization = `Bearer ${token}`;
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
        // Сбрасываем токен
        resetToken();
        
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