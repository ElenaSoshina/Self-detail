import api from '../api/apiService';
import { getToken } from '../api/apiService';

const fmt = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/**
 * Перенаправляет браузер на ваш .ics-эндпоинт,
 * что на iOS/macOS вызовет диалог «Добавить в Календарь»
 */
export const openICS = (bookingId: number): void => {
  const tg = (window as any).Telegram?.WebApp;
  const token = getToken();
  
  // Формируем URL с токеном авторизации
  const icsUrl = `${api.defaults.baseURL}/calendar/booking/${bookingId}/ics${token ? `?token=${token}` : ''}`;
  
  console.log('Открываем ICS-файл с сервера:', icsUrl);
  
  // В Telegram WebApp используем tg.openLink
  if (tg && tg.openLink) {
    tg.openLink(icsUrl);
  } else {
    // В обычном браузере просто переходим по ссылке
    window.location.href = icsUrl;
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
