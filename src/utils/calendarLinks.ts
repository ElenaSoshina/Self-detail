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
    // Создаем URL для скачивания ICS файла
    // НЕ используем blob URL для Telegram WebApp, они не поддерживаются
    const apiBaseUrl = api.defaults.baseURL; 
    const token = getToken();
    
    // Получаем URL на файл ICS (этот URL будет работать в Telegram WebApp)
    const fileUrl = `${apiBaseUrl}/calendar/booking/${bookingId}/ics`;
    
    // Подготавливаем заголовки авторизации
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    alert(`Для iOS/Apple используем URL: ${fileUrl}`);

    // Для iOS устройств лучше открыть напрямую URL с заголовками
    if (tg && tg.openLink) {
      // К сожалению, tg.openLink не поддерживает заголовки
      // Для iOS/Apple существует особый способ открытия
      
      // 1. Проверяем, на iOS ли мы
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        alert('Обнаружено iOS устройство. Открываем через Data URL');
        
        // Для iOS используем fetch напрямую с последующим преобразованием в Data URL
        try {
          // Выполняем запрос с заголовками авторизации
          const response = await fetch(fileUrl, { 
            headers,
            method: 'GET',
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          // Создаем элемент <a> для скачивания файла
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = `calendar-event-${bookingId}.ics`;
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          
          // Скачиваем файл
          downloadLink.click();
          
          // Очищаем ресурсы
          setTimeout(() => {
            URL.revokeObjectURL(downloadLink.href);
            document.body.removeChild(downloadLink);
          }, 1000);
          
          alert('Файл ICS скачан. Проверьте загрузки устройства.');
        } catch (fetchError) {
          alert(`Ошибка при загрузке файла: ${(fetchError as Error).message}`);
        }
      } else {
        // Для других устройств просто перенаправляем через Telegram
        alert('Открываем через Telegram WebApp');
        tg.openLink(fileUrl);
      }
    } else {
      // Если нет Telegram WebApp, используем обычное скачивание
      alert('Нет Telegram WebApp. Скачиваем файл через браузер');
      
      // Используем axios вместо fetch для автоматической обработки заголовков
      const response = await api.get(`/calendar/booking/${bookingId}/ics`, {
        responseType: 'blob',
        headers: {
          'Accept': 'text/calendar',
        }
      });
      
      // Создаем ссылку для скачивания
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `calendar-event-${bookingId}.ics`;
      document.body.appendChild(link);
      
      // Скачиваем файл
      link.click();
      
      // Очищаем ресурсы
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);
      }, 1000);
      
      alert('Файл ICS скачан. Откройте его для добавления события в календарь.');
    }
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