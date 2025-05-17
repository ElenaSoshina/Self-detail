import api from '../api/apiService';
import { getToken } from '../api/apiService';

/**
 * Форматирует дату для URL Google Calendar
 */
const fmt = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/**
 * Создает webcal:// ссылку для Apple Calendar
 * @param bookingId ID бронирования
 */
export const buildAppleCalendarLink = (bookingId: number): string => {
  const apiBaseUrl = api.defaults.baseURL;
  
  // Заменяем http:// или https:// на webcal://
  const webcalUrl = `${apiBaseUrl}/calendar/booking/${bookingId}/ics`
    .replace(/^http:\/\//i, 'webcal://')
    .replace(/^https:\/\//i, 'webcal://');
  
  return webcalUrl;
};

/**
 * Открывает событие в Apple Calendar
 * @param bookingId ID бронирования
 */
export const openICS = async (bookingId: number): Promise<void> => {
  const tg = (window as any).Telegram?.WebApp;
  
  try {
    // Формируем webcal:// ссылку для Apple Calendar
    const webcalUrl = buildAppleCalendarLink(bookingId);
    
    alert(`Открываем Apple Calendar с URL: ${webcalUrl}`);
    
    // На iOS устройствах webcal:// должен открыть нативное приложение календаря
    if (tg && tg.openLink) {
      tg.openLink(webcalUrl);
    } else {
      // Если нет Telegram WebApp, открываем напрямую
      window.location.href = webcalUrl;
    }
  } catch (error) {
    alert(`Ошибка при открытии Apple Calendar: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    console.error('Ошибка при открытии Apple Calendar:', error);
    throw error;
  }
};

/**
 * Генерирует URL для добавления события в Google Calendar
 */
export const buildGoogleLink = (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): string => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Открывает ссылку Google Calendar в Telegram WebApp
 */
export const openGoogleCalendar = (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): void => {
  const tg = (window as any).Telegram?.WebApp;
  const url = buildGoogleLink(title, description, location, start, end);
  
  // Для отладки
  alert(`Открываем Google Calendar с URL: ${url}`);
  
  if (tg && tg.openLink) {
    tg.openLink(url);
  } else {
    // Если Telegram WebApp недоступен, используем обычный переход
    window.open(url, '_blank');
  }
}; 