import api from '../api/apiService';

const fmt = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/**
 * Перенаправляет браузер на ваш .ics-эндпоинт,
 * что на iOS/macOS вызовет диалог «Добавить в Календарь»
 */
export const openICS = (bookingId: number): void => {
  window.location.href = `${api.defaults.baseURL}/calendar/booking/${bookingId}/ics`;
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
