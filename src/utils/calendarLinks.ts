import api from '../api/apiService';
import { getToken, login } from '../api/apiService';

/**
 * Форматирует дату для URL Google Calendar
 */
const fmt = (d: Date | undefined): string => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
    throw new Error('Неверная дата');
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

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
  // Проверяем даты
  if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
    throw new Error('Неверная дата начала события');
  }
  
  if (!end || !(end instanceof Date) || isNaN(end.getTime())) {
    throw new Error('Неверная дата окончания события');
  }
  
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
SUMMARY:${title || 'Бронирование'}
DESCRIPTION:${description || ''}
LOCATION:${location || ''}
END:VEVENT
END:VCALENDAR`;
};

/**
 * Создает data URI для ICS файла
 */
export const buildAppleCalendarLink = (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): string => {
  try {
    // Создаем содержимое ICS файла
    const ics = generateICSContent(title, description, location, start, end);
    
    // Создаем data URI
    const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    
    return dataUri;
  } catch (error) {
    console.error('Ошибка в buildAppleCalendarLink:', error);
    throw error;
  }
};

/**
 * Открывает событие в Apple Calendar через data URI
 */
export const openICS = (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): void => {
  const tg = (window as any).Telegram?.WebApp;
  
  try {
    // Проверка параметров
    if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
      throw new Error('Неверная дата начала события');
    }
    
    if (!end || !(end instanceof Date) || isNaN(end.getTime())) {
      throw new Error('Неверная дата окончания события');
    }
    
    // Генерируем data URI с ICS содержимым
    const dataUri = buildAppleCalendarLink(title, description, location, start, end);
    
    // Для отладки
    console.log('Открываем Apple Calendar с data URI события:', title);
    
    // Открываем data URI
    if (tg?.openLink) {
      tg.openLink(dataUri);
    } else {
      window.location.href = dataUri;
    }
  } catch (error) {
    console.error('Ошибка при открытии Apple Calendar:', error);
    alert(`Ошибка при создании календарного события: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
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
  // Проверяем даты
  if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
    throw new Error('Неверная дата начала события');
  }
  
  if (!end || !(end instanceof Date) || isNaN(end.getTime())) {
    throw new Error('Неверная дата окончания события');
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Бронирование',
    details: description || '',
    location: location || '',
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
  try {
    // Проверка параметров
    if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
      throw new Error('Неверная дата начала события');
    }
    
    if (!end || !(end instanceof Date) || isNaN(end.getTime())) {
      throw new Error('Неверная дата окончания события');
    }
    
    const tg = (window as any).Telegram?.WebApp;
    const url = buildGoogleLink(title, description, location, start, end);
    
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      // Если Telegram WebApp недоступен, используем обычный переход
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Ошибка в openGoogleCalendar:', error);
    alert(`Ошибка при создании календарного события: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}; 