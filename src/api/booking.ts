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
    console.log('Данные для бронирования (до преобразования):', bookingData);
    
    // Создаем правильную структуру данных для API
    const apiData = {
      telegramUserId: bookingData.telegramUserName ? parseInt(bookingData.telegramUserName.replace(/\D/g, '')) || 0 : 0,
      telegramUserName: bookingData.telegramUserName?.startsWith('@') 
        ? bookingData.telegramUserName 
        : `@${bookingData.telegramUserName || ''}`,
      clientName: bookingData.name || '',
      clientPhone: bookingData.phone || '',
      clientEmail: bookingData.email || '',
      start: bookingData.startTime ? new Date(new Date().setHours(parseInt(bookingData.startTime.split(':')[0]), parseInt(bookingData.startTime.split(':')[1]))).toISOString() : new Date().toISOString(),
      end: bookingData.endTime ? new Date(new Date().setHours(parseInt(bookingData.endTime.split(':')[0]), parseInt(bookingData.endTime.split(':')[1]))).toISOString() : new Date().toISOString(),
      service: bookingData.service 
        ? [{ 
            serviceName: bookingData.service.serviceName || 'Товары', 
            price: bookingData.service.price || 0 
          }] 
        : [],
      notes: '',
      products: []
    };

    console.log('Данные, отправляемые на сервер:', apiData);
    alert(`Отправка на API: ${JSON.stringify(apiData, null, 2)}`);

    const response = await fetch(`${API_URL}/calendar/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      alert(`Ошибка от сервера: ${response.status} ${response.statusText}\n${responseText}`);
      throw new Error(`Ошибка при создании бронирования: ${response.status} ${responseText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { message: 'Успешно, но невалидный JSON в ответе' };
    }

    return responseData;
  } catch (error) {
    console.error('Ошибка:', error);
    alert(`Ошибка в createBooking: ${error}`);
    throw error;
  }
}; 