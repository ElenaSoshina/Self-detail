import api from '../api/apiService';
import { getToken } from '../api/apiService';

/**
 * Форматирует дату для URL Google Calendar
 */
const fmt = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/**
 * Скачивает ICS файл через API и открывает его
 * @param bookingId ID бронирования
 */
export const openICS = async (bookingId: number): Promise<void> => {
  const tg = (window as any).Telegram?.WebApp;
  
  try {
    // Делаем запрос к API для получения ICS данных
    alert('Запрашиваем ICS файл через API...');
    
    const response = await api.get(`/calendar/booking/${bookingId}/ics`, {
      headers: {
        'Accept': 'text/calendar',
      },
      responseType: 'blob'
    });
    
    alert('ICS файл получен от API');
    
    // Создаем временный URL для скачанного ICS файла
    const blob = new Blob([response.data], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    
    // Используем Telegram.WebApp.openLink или window.location
    if (tg && tg.openLink) {
      alert('Открываем ICS через Telegram.WebApp.openLink');
      tg.openLink(url);
    } else {
      alert('Открываем ICS через window.location');
      window.location.href = url;
    }
    
    // Освобождаем URL через некоторое время
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
    
  } catch (error) {
    alert(`Ошибка при загрузке ICS файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    console.error('Ошибка при загрузке ICS файла:', error);
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