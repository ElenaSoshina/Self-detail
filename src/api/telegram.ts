const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';
export const ADMIN_CHAT_ID = '522814078'; // ID чата администратора

export const sendTelegramMessage = async (message: string, chatId: string) => {
  try {
    const response = await fetch(`${API_URL}/chat/send-message/${chatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message
      }),
    });

    if (!response.ok) {
      throw new Error('Ошибка при отправке сообщения');
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    throw error;
  }
};

export const formatUserMessage = (bookingData: any, service: any, serviceRu: string) => {
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };
  const dateStr = formatDate(bookingData.start);
  const timeStr = `${formatTime(bookingData.start)} - ${formatTime(bookingData.end)}`;
  return `
Ваше бронирование успешно создано!

📅 Дата: ${dateStr}
🕒 Время: ${timeStr}

📋 Услуга: ${serviceRu}
💰 Стоимость: ${service.price}₽
`;
};

export const formatAdminMessage = (bookingData: any, service: any, serviceRu: string) => {
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const h = String(date.getUTCHours()).padStart(2, '0');
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };
  const dateStr = formatDate(bookingData.start);
  const timeStr = `${formatTime(bookingData.start)} - ${formatTime(bookingData.end)}`;
  return `
Новое бронирование

👤 Клиент: ${bookingData.clientName}
📱 Телефон: ${bookingData.clientPhone}
📧 Email: ${bookingData.clientEmail}
📱 Telegram: ${bookingData.telegramUserName}

📅 Дата: ${dateStr}
🕒 Время: ${timeStr}

📋 Услуга: ${serviceRu}
💰 Стоимость: ${service.price}₽
`;
}; 