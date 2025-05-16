import axios from 'axios';
import { getBackendUsername, getBackendPassword } from '../utils/env';

// Расширяем тип конфигурации axios для добавления нашего поля
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    __offlineMode?: boolean;
  }
}

// Флаг для работы в оффлайн-режиме
let offlineMode = false;

// Функция установки/проверки оффлайн-режима
export const isOfflineMode = () => offlineMode;
export const setOfflineMode = (value: boolean) => {
  offlineMode = value;
  if (value) {
    console.log('API переключен в оффлайн-режим');
  } else {
    console.log('API переключен в онлайн-режим');
  }
};

// Всегда используем прямой URL к бэкенду
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

// Флаг для определения состояния первичной авторизации
let isInitialAuthComplete = false;

/**
 * Функция для авторизации и получения токена
 * @returns Promise с токеном авторизации
 */
export const login = async (): Promise<string> => {
  // Для отладки в Telegram
  const isTelegram = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
  if (isTelegram) {
    alert(`[AUTH] Начало процесса авторизации`);
  }
  
  // Если запрос за токеном уже выполняется, возвращаем его результат
  if (tokenPromise) {
    if (isTelegram) {
      alert(`[AUTH] Авторизация уже выполняется. Ждем результата.`);
    }
    return tokenPromise;
  }
  
  // Создаем новый промис для получения токена
  tokenPromise = (async () => {
    try {
      // Сначала проверяем, есть ли уже токен в localStorage
      const existingToken = localStorage.getItem('jwt_token');
      if (existingToken) {
        console.log('Используем существующий токен из localStorage');
        if (isTelegram) {
          alert(`[AUTH] Найден существующий токен (${existingToken.length} символов)`);
        }
        isInitialAuthComplete = true;
        return existingToken;
      }
      
      const username = getBackendUsername();
      const password = getBackendPassword();
      
      if (isTelegram) {
        alert(`[AUTH] Данные: логин=${username ? 'указан' : 'не указан'}, пароль=${password ? 'указан' : 'не указан'}`);
      }
      
      if (!username || !password) {
        console.error('Учетные данные не найдены в переменных окружения');
        if (isTelegram) {
          alert(`[AUTH] Ошибка: учетные данные не найдены`);
        }
        throw new Error('Учетные данные не найдены в переменных окружения');
      }
      
      console.log('Выполняем запрос на авторизацию');
      if (isTelegram) {
        alert(`[AUTH] Отправка запроса на ${API_URL}/auth/login`);
      }
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });
      
      // Для отладки в Telegram
      if (isTelegram) {
        alert(`[AUTH] Ответ получен: HTTP ${response.status}`);
        alert(`[AUTH] Данные ответа: ${JSON.stringify(response.data).substring(0, 150)}...`);
      }
      
      // Извлечение токена из ответа
      let token: string;
      if (response.data?.success && response.data?.data?.token) {
        // Сохраняем токен из нового формата ответа
        token = response.data.data.token;
        if (isTelegram) {
          alert(`[AUTH] Токен получен из формата: response.data.data.token`);
        }
      } else if (response.data && response.data.token) {
        // Для обратной совместимости со старым форматом
        token = response.data.token;
        if (isTelegram) {
          alert(`[AUTH] Токен получен из формата: response.data.token`);
        }
      } else {
        if (isTelegram) {
          alert(`[AUTH] Ошибка: не удалось найти токен в ответе`);
        }
        throw new Error('Не удалось получить токен');
      }
      
      // Проверяем валидность токена
      if (token.length < 20) {
        if (isTelegram) {
          alert(`[AUTH] Предупреждение: токен слишком короткий (${token.length} символов)`);
        }
      }
      
      // Сохраняем токен в localStorage
      localStorage.setItem('jwt_token', token);
      console.log('Токен успешно получен и сохранен');
      
      if (isTelegram) {
        alert(`[AUTH] Токен сохранен в localStorage (${token.length} символов)`);
      }
      
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
        
        if (isTelegram) {
          alert(`[AUTH] Ошибка HTTP: ${error.message}`);
          
          // Анализируем ответ сервера, если есть
          if (error.response) {
            alert(`[AUTH] Статус ответа: ${error.response.status}`);
            alert(`[AUTH] Данные ошибки: ${JSON.stringify(error.response.data).substring(0, 200)}`);
          } else if (error.request) {
            alert(`[AUTH] Нет ответа от сервера (возможно проблемы с сетью)`);
          }
        }
      } else {
        console.error('Ошибка авторизации:', error);
        if (isTelegram) {
          alert(`[AUTH] Ошибка JS: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
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
    // Проверка на оффлайн-режим
    if (offlineMode && config.url && !config.url.includes('/auth/login')) {
      console.log(`[API] Запрос ${config.url} отменен (оффлайн режим)`);
      // Возвращаем отмененный запрос с отметкой для имитации ответа
      config.__offlineMode = true;
      return config;
    }
    
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
    // Проверяем, был ли запрос в оффлайн-режиме
    if (error.config && error.config.__offlineMode) {
      console.log('[API] Имитация ответа в оффлайн режиме');
      
      // Имитируем успешный ответ для разных типов запросов
      const url = error.config.url || '';
      
      if (url.includes('available')) {
        // Для календаря возвращаем пустой список слотов
        return {
          data: {
            success: true,
            data: []
          },
          status: 200,
          statusText: 'OK (OFFLINE)'
        };
      }
      
      // Для других запросов просто успешный ответ
      return {
        data: { success: true, data: {} },
        status: 200,
        statusText: 'OK (OFFLINE)'
      };
    }
    
    // Проверка на DNS ошибки и другие сетевые проблемы
    if (!error.response && (error.code === 'ENOTFOUND' || error.message.includes('getaddrinfo'))) {
      console.error('DNS-ошибка при подключении к API:', error.message);
      
      // В Telegram показываем сообщение об ошибке
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        alert(`[DEBUG] Ошибка подключения к серверу: ${error.message}`);
      }
      
      // Пробрасываем ошибку дальше
      return Promise.reject(error);
    }
    
    // Проверка на сетевые ошибки (например, CORS, нет соединения)
    if (!error.response) {
      console.error('Сетевая ошибка:', error.message);
      
      // Для Telegram WebApp меняем стратегию запроса при сетевой ошибке
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        console.log('Обнаружен Telegram WebApp, пробуем альтернативный запрос');
        
        try {
          // Попытка прямого запроса без прокси для Telegram
          const directUrl = 'https://backend.self-detailing.duckdns.org/api/v1' + error.config?.url;
          
          // Создаем новый запрос с копией параметров оригинального
          const directResponse = await axios({
            url: directUrl,
            method: error.config?.method,
            headers: {
              ...error.config?.headers,
              'Authorization': getToken() ? `Bearer ${getToken()}` : ''
            },
            params: error.config?.params,
            data: error.config?.data
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
    if (error.response && error.response.status === 401 && !error.config._retry) {
      error.config._retry = true;
      
      try {
        // Сбрасываем токен
        resetToken();
        
        // Получаем новый токен
        const token = await login();
        
        // Обновляем заголовок в текущем запросе
        error.config.headers.Authorization = `Bearer ${token}`;
        
        // Повторяем запрос
        return axios(error.config);
      } catch (loginError) {
        console.error('Ошибка при повторной авторизации:', loginError);
        return Promise.reject(loginError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 