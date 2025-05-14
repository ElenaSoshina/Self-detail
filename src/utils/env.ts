/**
 * Утилита для работы с переменными окружения
 */

// Получение переменной окружения с проверкой наличия в import.meta.env
export const getEnvVariable = (key: string): string => {
  // В Vite переменные окружения доступны через import.meta.env.VITE_*
  // Пробуем искать и с префиксом VITE_ и без него
  const valueWithVitePrefix = import.meta.env[`VITE_${key}`];
  const value = valueWithVitePrefix || import.meta.env[key] || process.env[key];
  
  if (!value) {
    console.warn(`Переменная окружения ${key} не найдена`);
    return '';
  }
  
  return value;
};

// Получение имени пользователя для авторизации
export const getBackendUsername = (): string => {
  const value = getEnvVariable('BACKEND_USERNAME');
  if (!value) {
    console.error('BACKEND_USERNAME не найден в переменных окружения');
  }
  return value;
};

// Получение пароля для авторизации
export const getBackendPassword = (): string => {
  const value = getEnvVariable('BACKEND_PASSWORD');
  if (!value) {
    console.error('BACKEND_PASSWORD не найден в переменных окружения');
  }
  return value;
}; 