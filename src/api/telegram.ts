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

export const formatUserMessage = (bookingData: any) => {
  return `
Ваше бронирование успешно создано!

🕒 Время: ${bookingData.start} - ${bookingData.end}

📋 Услуга: ${bookingData.service[0].serviceName}
💰 Стоимость: ${bookingData.service[0].price}₽

  `;
};

export const formatAdminMessage = (bookingData: any) => {
  return `
Новое бронирование

👤 Клиент: ${bookingData.clientName}
📱 Телефон: ${bookingData.clientPhone}
📧 Email: ${bookingData.clientEmail}
📱 Telegram: @${bookingData.telegramUserName}

🕒 Время: ${bookingData.start} - ${bookingData.end}

📋 Услуга: ${bookingData.service[0].serviceName}
💰 Стоимость: ${bookingData.service[0].price}₽
  `;
}; 