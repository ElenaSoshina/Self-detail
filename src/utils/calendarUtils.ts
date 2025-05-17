import api from '../api/apiService';
import { getToken } from '../api/apiService';

// Базовый URL API
const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

const fmt = (d: Date | undefined): string => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
    throw new Error('Неверная дата');
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Открывает событие в календаре iOS/macOS через внешний браузер (Safari).
 * Safari автоматически распознает .ics файл и предложит добавить его в Календарь.
 */
export const openICS = (bookingId: number): void => {
  try {
    const tg = (window as any).Telegram?.WebApp;
    const token = getToken();
    const baseApiUrl = (api.defaults.baseURL || API_URL);
    
    // Проверяем валидность bookingId
    if (!bookingId || isNaN(Number(bookingId))) {
      throw new Error('Неверный ID бронирования');
    }
    
    // Прямая ссылка на ICS файл 
    const icsUrl = `${baseApiUrl}/calendar/booking/${bookingId}/ics${token ? `?token=${token}` : ''}`;
    
    console.log('Открываем .ics файл во внешнем браузере:', icsUrl);
    
    // В Telegram WebApp используем tg.openLink для открытия внешнего браузера
    if (tg && tg.openLink) {
      tg.openLink(icsUrl);
    } else {
      // В обычном браузере открываем в новой вкладке
      window.open(icsUrl, '_blank');
    }
  } catch (error) {
    console.error('Ошибка в openICS:', error);
    throw error;
  }
};

/**
 * Определяет, нужно ли показывать кнопку Apple Calendar
 * Кнопка показывается только для iOS и macOS
 */
export const shouldShowAppleCalendar = (): boolean => {
  const tg = (window as any).Telegram?.WebApp;
  const platform = tg?.platform || 'unknown';
  return platform === 'ios' || platform === 'macos';
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
