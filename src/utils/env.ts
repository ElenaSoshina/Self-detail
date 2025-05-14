/**
 * Утилита для работы с переменными окружения
 */

// Получение переменной окружения с проверкой наличия в import.meta.env
export const getEnvVariable = (key: string): string => {
  const value = import.meta.env[key] || process.env[key];
  
  if (!value) {
    console.warn(`Переменная окружения ${key} не найдена`);
    return '';
  }
  
  return value;
};

// Получение имени пользователя для авторизации
export const getBackendUsername = (): string => {
  return getEnvVariable('BACKEND_USERNAME');
};

// Получение пароля для авторизации
export const getBackendPassword = (): string => {
  return getEnvVariable('BACKEND_PASSWORD');
}; 