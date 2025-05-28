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
  console.log('📤 Начинаем отправку сообщения всем администраторам:', {
    adminChats: ADMIN_CHAT_IDS,
    messagePreview: message.substring(0, 100) + '...'
  });

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  // Отправляем сообщения последовательно, чтобы отследить каждую ошибку
  for (const chatId of ADMIN_CHAT_IDS) {
    try {
      console.log(`📤 Отправляем сообщение администратору ${chatId}...`);
      const result = await sendTelegramMessage(chatId, message);
      results.push({ chatId, status: 'success', result });
      successCount++;
      console.log(`✅ Успешно отправлено администратору ${chatId}`);
    } catch (error: any) {
      results.push({ chatId, status: 'error', error: error.message });
      errorCount++;
      console.error(`❌ Ошибка отправки администратору ${chatId}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  console.log('📊 Итоги отправки администраторам:', {
    total: ADMIN_CHAT_IDS.length,
    success: successCount,
    errors: errorCount,
    results: results
  });

  // Если ни одно сообщение не отправилось, выбрасываем ошибку
  if (successCount === 0) {
    throw new Error(`Не удалось отправить сообщение ни одному администратору. Ошибки: ${results.map(r => `${r.chatId}: ${r.status === 'error' ? r.error : 'unknown'}`).join(', ')}`);
  }

  // Если отправилось хотя бы одно сообщение, считаем операцию успешной
  if (errorCount > 0) {
    console.warn(`⚠️ Частичная отправка: ${successCount}/${ADMIN_CHAT_IDS.length} администраторов получили сообщение`);
  }
};

export const sendTelegramMessage = async (chatId: string, message: string) => {
  console.log('📤 Отправляем сообщение в Telegram:', {
    chatId: chatId,
    messageLength: message.length,
    endpoint: `/chats/send-message/${chatId}`
  });

  try {
    const response = await api.post(`/chats/send-message/${chatId}`, {
      message: message
    });

    console.log('✅ Ответ от сервера для чата', chatId, ':', response.data);

    if (!response.data) {
      throw new Error('Ошибка при отправке сообщения - пустой ответ от сервера');
    }

    return response.data;
  } catch (error: any) {
    console.error('❌ Ошибка при отправке сообщения в чат', chatId, ':', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
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
  
  const startDate = new Date(bookingData.start);
  const endDate = new Date(bookingData.end);
  const startDateStr = formatDate(bookingData.start);
  const endDateStr = formatDate(bookingData.end);
  const startTimeStr = formatTime(bookingData.start);
  const endTimeStr = formatTime(bookingData.end);
  
  // Проверяем, переходит ли бронирование на следующий день
  const isCrossingDays = startDate.toDateString() !== endDate.toDateString();
  
  let dateTimeStr;
  if (isCrossingDays) {
    // Межсуточное бронирование
    dateTimeStr = `📅 Дата: ${startDateStr} — ${endDateStr}\n🕒 Время: ${startTimeStr} — ${endTimeStr}`;
  } else {
    // Обычное бронирование в пределах дня
    dateTimeStr = `📅 Дата: ${startDateStr}\n🕒 Время: ${startTimeStr} — ${endTimeStr}`;
  }
  
  let productsBlock = '';
  if (bookingData.products && Array.isArray(bookingData.products) && bookingData.products.length > 0) {
    const productsTotal = bookingData.products.reduce((sum: number, p: any) => sum + p.price * p.quantity, 0);
    productsBlock = '\n🛒 Товары:' + bookingData.products.map((p: any) => `\n- ${p.name} x${p.quantity} = ${p.price * p.quantity}₽`).join('') +
      `\nСумма товаров: ${productsTotal}₽` +
      (bookingData.totalPrice ? `\n\n💵 Итоговая сумма: ${bookingData.totalPrice}₽` : '');
  }
  const serviceText = serviceRu || service?.serviceName || 'Технические работы';
  return `\nВаше бронирование успешно создано!\n\n${dateTimeStr}\n\n📋 Услуга: ${serviceText}\n💰 Стоимость: ${service.price}₽${productsBlock}`;
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
  
  const startDate = new Date(bookingData.start);
  const endDate = new Date(bookingData.end);
  const startDateStr = formatDate(bookingData.start);
  const endDateStr = formatDate(bookingData.end);
  const startTimeStr = formatTime(bookingData.start);
  const endTimeStr = formatTime(bookingData.end);
  
  // Проверяем, переходит ли бронирование на следующий день
  const isCrossingDays = startDate.toDateString() !== endDate.toDateString();
  
  let dateTimeStr;
  if (isCrossingDays) {
    // Межсуточное бронирование
    dateTimeStr = `📅 Дата: ${startDateStr} — ${endDateStr}\n🕒 Время: ${startTimeStr} — ${endTimeStr}`;
  } else {
    // Обычное бронирование в пределах дня
    dateTimeStr = `📅 Дата: ${startDateStr}\n🕒 Время: ${startTimeStr} — ${endTimeStr}`;
  }
  
  let productsBlock = '';
  if (bookingData.products && Array.isArray(bookingData.products) && bookingData.products.length > 0) {
    const productsTotal = bookingData.products.reduce((sum: number, p: any) => sum + p.price * p.quantity, 0);
    productsBlock = '\n🛒 Товары:' + bookingData.products.map((p: any) => `\n- ${p.name} x${p.quantity} = ${p.price * p.quantity}₽`).join('') +
      `\nСумма товаров: ${productsTotal}₽` +
      (bookingData.totalPrice ? `\n\n💵 Итоговая сумма: ${bookingData.totalPrice}₽` : '');
  }
  const serviceText = serviceRu || service?.serviceName || 'Технические работы';
  return `\nНовое бронирование\n\n👤 Клиент: ${bookingData.clientName}\n📱 Телефон: ${bookingData.clientPhone}\n📧 Email: ${bookingData.clientEmail}\n📱 Telegram: ${bookingData.telegramUserName}\n\n${dateTimeStr}\n\n📋 Услуга: ${serviceText}\n💰 Стоимость: ${service.price}₽${productsBlock}`;
};

/**
 * Тестовая функция для проверки отправки сообщений администраторам
 * Можно вызвать из консоли браузера для диагностики
 */
export const testAdminNotifications = async () => {
  const testMessage = `🧪 Тестовое сообщение\n\nВремя: ${new Date().toLocaleString('ru-RU')}\nЭто тест для проверки уведомлений администраторов.`;
  
  console.log('🧪 Запуск тестирования уведомлений администраторов...');
  
  try {
    await sendTelegramMessageToAllAdmins(testMessage);
    console.log('✅ Тест завершен успешно');
    return { success: true, message: 'Тестовые сообщения отправлены' };
  } catch (error: any) {
    console.error('❌ Тест завершен с ошибкой:', error);
    return { success: false, error: error.message };
  }
};

// Делаем функцию доступной глобально для отладки
if (typeof window !== 'undefined') {
  (window as any).testAdminNotifications = testAdminNotifications;
} 