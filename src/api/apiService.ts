import axios from 'axios';
import { getBackendUsername, getBackendPassword } from '../utils/env';

// Определяем правильный API URL в зависимости от среды выполнения
const API_URL = import.meta.env.DEV 
  ? '/api/v1' // В режиме разработки используем прокси
  : 'https://backend.self-detailing.duckdns.org/api/v1';

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

// Флаг для определения состояния первичной авторизации
let isInitialAuthComplete = false;

/**
 * Функция для авторизации и получения токена
 * @returns Promise с токеном авторизации
 */
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
        isInitialAuthComplete = true;
        return existingToken;
      }
      
      const username = getBackendUsername();
      const password = getBackendPassword();
      
      if (!username || !password) {
        console.error('Учетные данные не найдены в переменных окружения');
        throw new Error('Учетные данные не найдены в переменных окружения');
      }
      
      console.log('Выполняем запрос на авторизацию');
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });
      
      // Извлечение токена из ответа
      let token: string;
      if (response.data?.success && response.data?.data?.token) {
        // Сохраняем токен из нового формата ответа
        token = response.data.data.token;
      } else if (response.data && response.data.token) {
        // Для обратной совместимости со старым форматом
        token = response.data.token;
      } else {
        throw new Error('Не удалось получить токен');
      }
      
      // Сохраняем токен в localStorage
      localStorage.setItem('jwt_token', token);
      console.log('Токен успешно получен и сохранен');
      
      // Отмечаем, что первичная авторизация выполнена
      isInitialAuthComplete = true;
      
      return token;
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

/**
 * Получение токена из хранилища
 * @returns Токен или null, если токен не найден
 */
export const getToken = () => {
  return localStorage.getItem('jwt_token');
};

/**
 * Функция сброса токена (для выхода или при ошибках)
 */
export const resetToken = () => {
  localStorage.removeItem('jwt_token');
  tokenPromise = null;
  isInitialAuthComplete = false;
};

/**
 * Инициализация авторизации
 * Выполняет проверку токена и запрос на авторизацию при необходимости
 * @returns Promise, который завершается когда инициализация завершена
 */
export const initAuth = async (): Promise<void> => {
  if (isInitialAuthComplete) {
    return;
  }
  
  const token = getToken();
  
  // Если есть сохраненный токен, считаем инициализацию завершенной
  if (token) {
    isInitialAuthComplete = true;
    return;
  }
  
  // Если токена нет, запрашиваем новый
  try {
    await login();
    isInitialAuthComplete = true;
  } catch (error) {
    console.error('Ошибка при инициализации авторизации:', error);
    throw error;
  }
};

// Перехватчик запросов для добавления токена
api.interceptors.request.use(
  async (config) => {
    // Пропускаем добавление токена для запроса авторизации
    if (config.url && config.url.includes('/auth/login')) {
      return config;
    }
    
    // Проверяем, завершена ли инициализация
    if (!isInitialAuthComplete) {
      // Выполняем инициализацию перед отправкой запроса
      try {
        await initAuth();
      } catch (error) {
        console.error('Не удалось выполнить инициализацию авторизации:', error);
      }
    }
    
    // Получаем токен
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
        // Используем Bearer для всех запросов
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Добавлен токен авторизации:', `Bearer ${token.substring(0, 10)}...`);
      }
    } else {
      console.warn('Токен не добавлен к заголовкам, запрос будет отправлен без авторизации');
    }
    
    // Для отладки выводим полные параметры запроса
    if (config.url && config.url.includes('available')) {
      console.log('[API] Отправка запроса слотов:', {
        url: config.url,
        headers: config.headers,
        params: config.params
      });
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
    
    // Проверка на сетевые ошибки (например, CORS, нет соединения)
    if (!error.response) {
      console.error('Сетевая ошибка:', error.message);
      
      // Для Telegram WebApp меняем стратегию запроса при сетевой ошибке
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        console.log('Обнаружен Telegram WebApp, пробуем альтернативный запрос');
        
        try {
          // Попытка прямого запроса без прокси для Telegram
          const directUrl = 'https://backend.self-detailing.duckdns.org/api/v1' + originalRequest.url;
          
          // Создаем новый запрос с копией параметров оригинального
          const directResponse = await axios({
            url: directUrl,
            method: originalRequest.method,
            headers: {
              ...originalRequest.headers,
              'Authorization': getToken() ? `Bearer ${getToken()}` : ''
            },
            params: originalRequest.params,
            data: originalRequest.data
          });
          
          return directResponse;
        } catch (directError) {
          console.error('Альтернативный запрос тоже не удался:', directError);
          return Promise.reject(directError);
        }
      }
      
      return Promise.reject(error);
    }
    
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