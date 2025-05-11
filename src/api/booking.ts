// Определяем интерфейс прямо здесь
interface BookingFormData {
  name?: string;
  phone?: string;
  email?: string;
  telegramUserName?: string;
  startTime?: string;
  endTime?: string;
  selectedDate?: Date;
  service?: {
    serviceName?: string;
    price?: number;
  } | null;
  [key: string]: any; // Для любых других полей
}

const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

export const createBooking = async (bookingData: BookingFormData) => {
  try {
    alert('Начало создания бронирования');
    
    // Подготавливаем данные для API
    const apiData = {
      telegramUserId: 0, // Заполняется в компоненте
      telegramUserName: bookingData.telegramUserName?.startsWith('@') 
        ? bookingData.telegramUserName 
        : `@${bookingData.telegramUserName || ''}`,
      clientName: bookingData.name || '',
      clientPhone: bookingData.phone?.replace(/\+/g, '') || '',
      clientEmail: bookingData.email || '',
      start: '', // Будет заполнено в компоненте
      end: '',   // Будет заполнено в компоненте
      service: bookingData.service 
        ? [{ 
            serviceName: bookingData.service.serviceName || '', 
            price: bookingData.service.price || 0 
          }] 
        : [],
      notes: ''
    };
    
    alert('Подготовленные данные для API: ' + JSON.stringify(apiData));
    
    // Отправляем запрос
    const response = await fetch(`${API_URL}/calendar/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });
    
    // Обрабатываем ответ
    if (!response.ok) {
      const errorText = await response.text();
      alert('Ошибка сервера: ' + errorText);
      throw new Error(`Ошибка при создании бронирования: ${response.status} ${errorText}`);
    }
    
    const responseData = await response.json();
    alert('Бронирование успешно создано');
    return responseData;
  } catch (error) {
    alert('Ошибка в createBooking: ' + error);
    throw error;
  }
}; 