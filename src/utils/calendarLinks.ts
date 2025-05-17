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
 * Создает webcal:// ссылку для Apple Calendar с полными данными события
 */
export const buildAppleCalendarLink = (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): string => {
  // Создаем содержимое ICS файла
  const icsContent = generateICSContent(title, description, location, start, end);
  
  // Кодируем содержимое ICS в base64 и создаем data URL
  const base64Content = btoa(unescape(encodeURIComponent(icsContent)));
  
  // Создаем data URL, который можно открыть напрямую в браузере
  return `data:text/calendar;charset=utf-8;base64,${base64Content}`;
};

/**
 * Открывает событие в Apple Calendar
 */
export const openICS = async (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): Promise<void> => {
  const tg = (window as any).Telegram?.WebApp;
  
  try {
    // Генерируем data URL с событием календаря
    const icsURL = buildAppleCalendarLink(title, description, location, start, end);
    
    alert(`Открываем Apple Calendar с данными события: ${title}`);
    
    // Пробуем открыть сгенерированный URL
    if (tg && tg.openLink) {
      tg.openLink(icsURL);
    } else {
      // Если нет Telegram WebApp, открываем напрямую
      window.location.href = icsURL;
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