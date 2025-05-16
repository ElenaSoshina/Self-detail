import axios from 'axios';
import { getBackendUsername, getBackendPassword, isTelegramWebApp } from '../utils/env';

// Расширяем тип конфигурации axios (удалены поля оффлайн режима)
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    // дополнительные поля могут быть здесь
  }
}

// Всегда используем прямой URL к бэкенду
const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: '/api/v1',    // относительный путь
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
  const isTelegram = isTelegramWebApp();
  if (isTelegram) alert('[AUTH] Начало процесса авторизации');

  if (tokenPromise) {
    if (isTelegram) alert('[AUTH] Авторизация уже выполняется. Ждем результата.');
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const existingToken = localStorage.getItem('jwt_token');
      if (existingToken) {
        if (isTelegram) alert(`[AUTH] Найден существующий токен (${existingToken.length} символов)`);
        isInitialAuthComplete = true;
        return existingToken;
      }

      const username = getBackendUsername();
      const password = getBackendPassword();
      if (!username || !password) {
        console.error('Учетные данные не найдены в переменных окружения');
        if (isTelegram) alert('[AUTH] Ошибка: учетные данные не найдены');
        throw new Error('Учетные данные не найдены');
      }

      // Детальный вывод информации о логине и пароле в Telegram
      if (isTelegram) {
        alert(`[AUTH] Данные: логин="${username}", пароль="${password}"`);
        alert(`[AUTH] Длина логина: ${username.length}, длина пароля: ${password.length}`);
        alert(`[AUTH] Первые символы: логин=${username.charAt(0)}..., пароль=${password.charAt(0)}...`);
        alert(`[AUTH] Проверка на пустые значения: логин=${Boolean(username)}, пароль=${Boolean(password)}`);
      }

      if (isTelegram) alert(`[AUTH] Отправка запроса на ${API_URL}/auth/login`);
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      if (isTelegram) alert(`[AUTH] Ответ получен: HTTP ${response.status}`);

      let token: string;
      if (response.data?.success && response.data?.data?.token) {
        token = response.data.data.token;
      } else if (response.data && response.data.token) {
        token = response.data.token;
      } else {
        if (isTelegram) alert('[AUTH] Ошибка: не удалось найти токен в ответе');
        throw new Error('Не удалось получить токен');
      }

      localStorage.setItem('jwt_token', token);
      isInitialAuthComplete = true;
      return token;
    } catch (error) {
      tokenPromise = null;
      if (axios.isAxiosError(error)) {
        console.error(`Ошибка авторизации (${error.code}): ${error.message}`);
        if (isTelegram) {
          alert(`[AUTH] Ошибка HTTP: ${error.message}`);
          if (error.response) {
            alert(`[AUTH] Статус: ${error.response.status}, Данные: ${JSON.stringify(error.response.data).substring(0, 100)}`);
          }
        }
      } else {
        console.error('Ошибка авторизации:', error);
        if (isTelegram) alert(`[AUTH] Ошибка JS: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
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

// Перехватчик ответов для обработки 401 и сетевых ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isTelegram = isTelegramWebApp();
    // Сетевые ошибки
    if (!error.response) {
      console.error('Сетевая ошибка:', error.message);
      if (isTelegram) alert(`[DEBUG] Сетевая ошибка: ${error.message}`);
      throw error;
    }
    // Повтор авторизации при 401
    if (error.response.status === 401 && !error.config._retry) {
      error.config._retry = true;
      resetToken();
      try {
        const newToken = await login();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config);
      } catch (err) {
        console.error('Ошибка повторной авторизации:', err);
        throw err;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
