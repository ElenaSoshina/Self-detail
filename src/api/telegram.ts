import api from './apiService';

// Массив ID чатов администраторов
export const ADMIN_CHAT_IDS = ['522814078', '67030677']; // IDs чатов администраторов
export const ADMIN_CHAT_ID = ADMIN_CHAT_IDS[0]; // Для обратной совместимости

/**
 * Отправляет сообщение всем администраторам из массива ADMIN_CHAT_IDS
 * @param message Текст сообщения для отправки
 * @returns Promise<void>
 */
export const sendTelegramMessageToAllAdmins = async (message: string) => {
  const promises = ADMIN_CHAT_IDS.map(chatId => 
    sendTelegramMessage(chatId, message)
  );
  
  try {
    await Promise.all(promises);
  } catch (error) {
    console.error('Ошибка при отправке сообщений администраторам:', error);
    throw error;
  }
};

export const sendTelegramMessage = async (message: string, chatId: string) => {
  try {
    const response = await api.post(`/chats/send-message/${chatId}`, {
      message: message
    });

    if (!response.data) {
      throw new Error('Ошибка при отправке сообщения');
    }

    return response.data;
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    throw error;
  }
};

export const sendTelegramMessageByUsername = async (message: string, username: string) => {
  if (!username) throw new Error('Username is required');
  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  
  try {
    const response = await api.post(`/chats/send-message/${encodeURIComponent(cleanUsername)}`, { 
      message 
    });
    
    if (!response.data) {
      throw new Error('Ошибка при отправке сообщения по username');
    }
    
    return response.data;
  } catch (error) {
    console.error('Ошибка при отправке сообщения по username:', error);
    throw error;
  }
};

export const formatUserMessage = (bookingData: any, service: any, serviceRu: string) => {
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (iso: string) => {
    const timePart = iso.split('T')[1];
    if (!timePart) return '00:00';
    
    const [hoursMinutes] = timePart.split(':');
    if (!hoursMinutes) return '00:00';
    
    const hours = hoursMinutes.padStart(2, '0');
    const minutes = (timePart.split(':')[1] || '00').padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };
  const dateStr = formatDate(bookingData.start);
  const timeStr = `${formatTime(bookingData.start)} - ${formatTime(bookingData.end)}`;
  let productsBlock = '';
  if (bookingData.products && Array.isArray(bookingData.products) && bookingData.products.length > 0) {
    const productsTotal = bookingData.products.reduce((sum: number, p: any) => sum + p.price * p.quantity, 0);
    productsBlock = '\n🛒 Товары:' + bookingData.products.map((p: any) => `\n- ${p.name} x${p.quantity} = ${p.price * p.quantity}₽`).join('') +
      `\nСумма товаров: ${productsTotal}₽` +
      (bookingData.totalPrice ? `\n\n💵 Итоговая сумма: ${bookingData.totalPrice}₽` : '');
  }
  const serviceText = serviceRu || service?.serviceName || 'Технические работы';
  return `\nВаше бронирование успешно создано!\n\n📅 Дата: ${dateStr}\n🕒 Время: ${timeStr}\n\n📋 Услуга: ${serviceText}\n💰 Стоимость: ${service.price}₽${productsBlock}`;
};

export const formatAdminMessage = (bookingData: any, service: any, serviceRu: string) => {
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (iso: string) => {
    const timePart = iso.split('T')[1];
    if (!timePart) return '00:00';
    
    const [hoursMinutes] = timePart.split(':');
    if (!hoursMinutes) return '00:00';
    
    const hours = hoursMinutes.padStart(2, '0');
    const minutes = (timePart.split(':')[1] || '00').padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };
  const dateStr = formatDate(bookingData.start);
  const timeStr = `${formatTime(bookingData.start)} - ${formatTime(bookingData.end)}`;
  let productsBlock = '';
  if (bookingData.products && Array.isArray(bookingData.products) && bookingData.products.length > 0) {
    const productsTotal = bookingData.products.reduce((sum: number, p: any) => sum + p.price * p.quantity, 0);
    productsBlock = '\n🛒 Товары:' + bookingData.products.map((p: any) => `\n- ${p.name} x${p.quantity} = ${p.price * p.quantity}₽`).join('') +
      `\nСумма товаров: ${productsTotal}₽` +
      (bookingData.totalPrice ? `\n\n💵 Итоговая сумма: ${bookingData.totalPrice}₽` : '');
  }
  const serviceText = serviceRu || service?.serviceName || 'Технические работы';
  return `\nНовое бронирование\n\n👤 Клиент: ${bookingData.clientName}\n📱 Телефон: ${bookingData.clientPhone}\n📧 Email: ${bookingData.clientEmail}\n📱 Telegram: ${bookingData.telegramUserName}\n\n📅 Дата: ${dateStr}\n🕒 Время: ${timeStr}\n\n📋 Услуга: ${serviceText}\n💰 Стоимость: ${service.price}₽${productsBlock}`;
}; 