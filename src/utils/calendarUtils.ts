import api from '../api/apiService';
import { getToken } from '../api/apiService';

const fmt = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

// Базовый URL API
const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

/**
 * Открывает событие в календаре iOS/macOS с использованием webcal-протокола,
 * который гарантирует открытие нативного приложения Calendar на устройствах Apple
 */
export const openICS = (bookingId: number): void => {
  const tg = (window as any).Telegram?.WebApp;
  const token = getToken();
  const baseApiUrl = (api.defaults.baseURL || API_URL);
  
  // Формируем URL с токеном авторизации
  const baseUrl = baseApiUrl.replace('https://', '').replace('http://', '');
  const icsUrl = `${baseUrl}/calendar/booking/${bookingId}/ics${token ? `?token=${token}` : ''}`;
  
  // Создаем ссылку с webcal-протоколом для Apple устройств
  const webcalUrl = `webcal://${icsUrl}`;
  
  // Создаем https-ссылку для резервного использования
  const httpsUrl = `${baseApiUrl}/calendar/booking/${bookingId}/ics${token ? `?token=${token}` : ''}`;
  
  console.log('Открываем календарь по ссылке:', webcalUrl);
  
  // В Telegram WebApp используем tg.openLink
  if (tg && tg.openLink) {
    // На устройствах Apple webcal:// должен открыть нативное приложение Calendar
    // Но при проблемах с этим, можно использовать https-ссылку
    tg.openLink(webcalUrl);
  } else {
    // В обычном браузере переходим по ссылке webcal://
    window.location.href = webcalUrl;
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
