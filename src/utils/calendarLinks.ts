import api from '../api/apiService';
import { getToken } from '../api/apiService';

/**
 * Форматирует дату для URL Google Calendar
 */
const fmt = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/**
 * Создает содержимое ICS файла для события
 */
const generateICSContent = (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): string => {
  // Форматируем даты для ICS
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };
  
  const startStr = formatDate(start);
  const endStr = formatDate(end);
  
  // Создаем минимальный валидный ICS файл
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Self-Detailing//Calendar//RU
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Math.random().toString(36).substring(2)}@self-detailing.duckdns.org
DTSTAMP:${formatDate(new Date())}
DTSTART:${startStr}
DTEND:${endStr}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;
};

/**
 * Создает URL для скачивания ICS файла с токеном авторизации
 */
export const buildAppleCalendarLink = (bookingId: number): string => {
  const base = api.defaults.baseURL;
  const token = getToken(); // JWT
  
  // Прокидываем токен как query-параметр
  return `${base}/calendar/booking/${bookingId}/ics?token=${token}`;
};

/**
 * Открывает ссылку на ICS файл
 */
export const openICS = (bookingId: number): void => {
  const tg = (window as any).Telegram?.WebApp;
  const url = buildAppleCalendarLink(bookingId);
  
  // Для отладки
  alert(`Открываем Apple Calendar с URL: ${url}`);
  
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.location.href = url;
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