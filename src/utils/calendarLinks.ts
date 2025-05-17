import api from '../api/apiService';
import { getToken, login } from '../api/apiService';

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
export const buildAppleCalendarLink = async (bookingId: number): Promise<string> => {
  const base = api.defaults.baseURL;
  
  // Перед формированием ссылки обновляем токен
  let token: string;
  try {
    token = await login();
    alert(`Токен получен: ${token.substring(0, 10)}...`);
  } catch (error) {
    alert(`Ошибка получения токена: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    token = getToken() || '';
  }
  
  // Прокидываем токен как query-параметр и проверяем его наличие
  if (!token) {
    alert('ВНИМАНИЕ: Токен отсутствует! Авторизация не будет работать.');
    return `${base}/calendar/booking/${bookingId}/ics`;
  }
  
  // Используем токен в URL
  const url = `${base}/calendar/booking/${bookingId}/ics?token=${encodeURIComponent(token)}`;
  
  // Логируем URL для отладки (скрыв большую часть токена)
  const debugUrl = url.replace(/(token=)([^&]+)/, (_, prefix, token) => 
    `${prefix}${token.substring(0, 10)}...${token.substring(token.length - 5)}`
  );
  console.log('Ссылка на календарь:', debugUrl);
  
  return url;
};

/**
 * Открывает ссылку на ICS файл
 */
export const openICS = async (bookingId: number): Promise<void> => {
  const tg = (window as any).Telegram?.WebApp;
  
  try {
    // Получаем URL с актуальным токеном
    const url = await buildAppleCalendarLink(bookingId);
    
    // Для отладки
    alert(`Открываем Apple Calendar с URL: ${url.substring(0, 50)}...`);
    
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.location.href = url;
    }
  } catch (error) {
    alert(`Ошибка при открытии Apple Calendar: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    console.error('Ошибка при открытии Apple Calendar:', error);
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