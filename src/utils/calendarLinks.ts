import api from '../api/apiService';

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