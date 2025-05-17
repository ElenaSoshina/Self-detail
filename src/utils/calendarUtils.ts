import api from '../api/apiService';

/**
 * Загружает ICS файл для указанного бронирования и добавляет его в календарь
 * @param bookingId ID бронирования для загрузки ICS файла
 */
export const downloadICSFile = async (bookingId: number): Promise<void> => {
  try {
    // Запрос на получение ICS файла
    const response = await api.get(`/calendar/booking/${bookingId}/ics`, {
      responseType: 'blob' // Получаем ответ как бинарные данные
    });
    
    // Создаем объект Blob из ответа с правильным MIME-типом
    const blob = new Blob([response.data], { 
      type: 'text/calendar;charset=utf-8;method=REQUEST' 
    });
    
    // Создаем URL для календаря
    const url = window.URL.createObjectURL(blob);
    
    // Определяем операционную систему и устройство для лучшей совместимости
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isMac = /Mac/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Разные стратегии добавления в календарь в зависимости от платформы
    if (isIOS) {
      // Для iOS устройств используем специальный подход
      window.location.href = url;
    } else if (isMobile) {
      // Для других мобильных устройств скачиваем файл .ics
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `booking-${bookingId}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Для десктопа пробуем несколько подходов
      
      // Сначала пробуем открыть файл напрямую, что вызовет календарное приложение
      const newWindow = window.open(url);
      
      // Если не сработало открытие в новом окне, используем скачивание
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `booking-${bookingId}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    
    // Очищаем ресурсы через время
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 2000);
    
  } catch (error) {
    console.error('Ошибка при загрузке ICS файла:', error);
    throw error;
  }
}; 