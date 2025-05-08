import { BookingFormData } from '../components/BookingModal/BookingModal';

const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1';

export const createBooking = async (bookingData: BookingFormData) => {
  try {
    const response = await fetch(`${API_URL}/calendar/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      throw new Error('Ошибка при создании бронирования');
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка:', error);
    throw error;
  }
}; 