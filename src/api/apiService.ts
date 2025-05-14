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
    
    if (!username || !password) {
      throw new Error('Учетные данные не найдены в переменных окружения');
    }
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password
    });
    
    if (response.data && response.data.token) {
      localStorage.setItem('jwt_token', response.data.token);
      return response.data.token;
    }
    
    throw new Error('Не удалось получить токен');
  } catch (error) {
    console.error('Ошибка авторизации:', error);
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
        console.error('Не удалось авторизоваться автоматически');
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