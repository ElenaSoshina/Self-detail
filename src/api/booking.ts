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
    alert('Начало createBooking');
    alert('Данные для бронирования: ' + JSON.stringify(bookingData));
    
    // Создаем правильную структуру данных для API
    const apiData = {
      telegramUserId: bookingData.telegramUserName ? parseInt(bookingData.telegramUserName.replace(/\D/g, '')) || 0 : 0,
      telegramUserName: bookingData.telegramUserName?.startsWith('@') 
        ? bookingData.telegramUserName 
        : `@${bookingData.telegramUserName || ''}`,
      clientName: bookingData.name || '',
      clientPhone: bookingData.phone || '',
      clientEmail: bookingData.email || '',
      start: '',
      end: '',
      services: bookingData.service 
        ? [{ 
            serviceName: bookingData.service.serviceName || 'Товары', 
            price: bookingData.service.price || 0 
          }] 
        : [],
      notes: '',
      products: []
    };

    alert('Сформированные данные для API: ' + JSON.stringify(apiData));

    // Правильно формируем даты для бронирования
    if (bookingData.selectedDate && bookingData.startTime) {
      const selectedDate = new Date(bookingData.selectedDate);
      const [startHours, startMinutes] = bookingData.startTime.split(':').map(Number);
      
      // Создаем объект даты для начала бронирования
      const startDate = new Date(selectedDate);
      startDate.setHours(startHours, startMinutes, 0, 0);
      apiData.start = startDate.toISOString();
      
      // Создаем объект даты для конца бронирования
      if (bookingData.endTime) {
        const [endHours, endMinutes] = bookingData.endTime.split(':').map(Number);
        const endDate = new Date(selectedDate);
        endDate.setHours(endHours, endMinutes, 0, 0);
        apiData.end = endDate.toISOString();
      } else {
        // Если нет endTime, устанавливаем +1 час к начальному времени
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        apiData.end = endDate.toISOString();
      }
    }

    alert('Данные с датами: ' + JSON.stringify(apiData));

    const response = await fetch(`${API_URL}/calendar/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    alert('Получен ответ от сервера: ' + response.status);

    if (!response.ok) {
      const errorText = await response.text();
      alert('Ошибка сервера: ' + errorText);
      throw new Error(`Ошибка при создании бронирования: ${response.status} ${errorText}`);
    }

    const responseData = await response.json();
    alert('Успешный ответ сервера: ' + JSON.stringify(responseData));
    return responseData;
  } catch (error) {
    alert('Ошибка в createBooking: ' + error);
    throw error;
  }
}; 