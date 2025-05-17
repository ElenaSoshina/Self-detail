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
    
    // Создаем объект Blob из ответа
    const blob = new Blob([response.data], { type: 'text/calendar' });
    
    // Создаем ссылку для скачивания
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `booking-${bookingId}.ics`);
    
    // Добавляем ссылку в DOM и имитируем клик
    document.body.appendChild(link);
    link.click();
    
    // Очищаем ресурсы
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error) {
    console.error('Ошибка при загрузке ICS файла:', error);
    throw error;
  }
}; 