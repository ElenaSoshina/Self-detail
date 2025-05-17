import api from '../api/apiService';

// Базовый URL API
const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

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
  try {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      location,
      dates: `${fmt(start)}/${fmt(end)}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch (error) {
    console.error('Ошибка в buildGoogleLink:', error);
    throw error;
  }
};
