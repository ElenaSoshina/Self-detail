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
      start: '',
      end: '',
      service: bookingData.service 
        ? [{ 
            serviceName: bookingData.service.serviceName || 'Товары', 
            price: bookingData.service.price || 0 
          }] 
        : [],
      notes: '',
      products: []
    };

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
      
      console.log('Выбранная дата:', selectedDate);
      console.log('Время начала:', bookingData.startTime);
      console.log('Время окончания:', bookingData.endTime);
      console.log('Итоговое время начала (ISO):', apiData.start);
      console.log('Итоговое время окончания (ISO):', apiData.end);
    } else {
      // Если нет выбранной даты или времени, используем текущую дату
      const now = new Date();
      apiData.start = now.toISOString();
      
      const oneHourLater = new Date(now);
      oneHourLater.setHours(oneHourLater.getHours() + 1);
      apiData.end = oneHourLater.toISOString();
    }

    console.log('Данные, отправляемые на сервер:', apiData);
    
    // Проверяем корректность данных перед отправкой
    if (!apiData.telegramUserName || !apiData.clientName || !apiData.clientPhone || !apiData.clientEmail) {
      alert('Ошибка: не заполнены обязательные поля формы. Проверьте имя, телефон, email и username Telegram.');
      throw new Error('Не заполнены обязательные поля формы');
    }

    // Формируем строку JSON и проверяем её валидность
    const jsonString = JSON.stringify(apiData);
    try {
      // Проверяем, что JSON валидный
      JSON.parse(jsonString);
      alert(`Отправка на API: ${jsonString}`);
    } catch (e) {
      alert(`ОШИБКА: Невалидный JSON: ${e}`);
      throw new Error(`Невалидный JSON: ${e}`);
    }

    const response = await fetch(`${API_URL}/calendar/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonString,
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