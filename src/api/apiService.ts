import axios from 'axios';
import { getBackendUsername, getBackendPassword } from '../utils/env';

// Расширяем тип конфигурации axios
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    // дополнительные поля могут быть здесь
  }
}

// Всегда используем прямой URL к бэкенду
const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Переменные для управления токеном
let tokenPromise: Promise<string> | null = null;
let isInitialAuthComplete = false;

/**
 * Функция для авторизации и получения токена
 * @returns Promise с токеном авторизации
 */
export const login = async (): Promise<string> => {
  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const existingToken = localStorage.getItem('jwt_token');
      if (existingToken) {
        isInitialAuthComplete = true;
        return existingToken;
      }

      const username = getBackendUsername();
      const password = getBackendPassword();
      if (!username || !password) {
        console.error('Учетные данные не найдены в переменных окружения');
        throw new Error('Учетные данные не найдены');
      }

      const response = await axios.post(`${API_URL}/auth/login`, { username, password });

      let token: string;
      if (response.data?.success && response.data?.data?.token) {
        token = response.data.data.token;
      } else if (response.data && response.data.token) {
        token = response.data.token;
      } else {
        throw new Error('Не удалось получить токен');
      }

      localStorage.setItem('jwt_token', token);
      isInitialAuthComplete = true;
      return token;
    } catch (error) {
      tokenPromise = null;
      if (axios.isAxiosError(error)) {
        console.error(`Ошибка авторизации (${error.code}): ${error.message}`);
      } else {
        console.error('Ошибка авторизации:', error);
      }
      throw error;
    }
  })();

  try {
    return await tokenPromise;
  } catch (error) {
    tokenPromise = null;
    throw error;
  }
};

/** Получение токена из хранилища */
export const getToken = () => localStorage.getItem('jwt_token');

/** Сброс токена */
export const resetToken = () => {
  localStorage.removeItem('jwt_token');
  tokenPromise = null;
  isInitialAuthComplete = false;
};

/** Инициализация авторизации */
export const initAuth = async (): Promise<void> => {
  if (isInitialAuthComplete) return;
  const token = getToken();
  if (token) {
    isInitialAuthComplete = true;
    return;
  }
  await login();
};

// Перехватчик запросов для добавления токена
api.interceptors.request.use(
  async (config) => {
    // Пропускаем логин
    if (config.url?.includes('/auth/login')) return config;

    if (!isInitialAuthComplete) {
      try { await initAuth(); } catch (e) { console.error('Не удалось инициализировать авторизацию', e); }
    }

    let token = getToken();
    if (!token) {
      try { token = await login(); } catch (e) { console.error('Не удалось получить токен автоматически', e); }
    }

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Перехватчик ответов для обработки 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Сетевые ошибки
    if (!error.response) {
      console.error('Сетевая ошибка:', error.message);
      throw error;
    }
    // Повтор авторизации при 401
    if (error.response.status === 401 && !error.config._retry) {
      error.config._retry = true;
      resetToken();
      try {
        const newToken = await login();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api(error.config);
      } catch (err) {
        console.error('Ошибка повторной авторизации:', err);
        throw err;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
