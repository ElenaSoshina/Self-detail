import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingModal from '../../components/BookingModal/BookingModal';
import styles from './BookingSuccess.module.css';
import { BookingDetails } from '../CalendarPage/calendarTypes';
import { useCart } from '../../context/CartContex';
import { sendTelegramMessage, formatAdminMessage, ADMIN_CHAT_ID } from '../../api/telegram';

interface BookingSuccessProps {
  bookingDetails: BookingDetails;
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ bookingDetails }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { items, clearCart } = useCart();
  const [formattedTime, setFormattedTime] = useState('');
  
  // Получаем товары из корзины (всё, кроме бронирования)
  const products = items.filter(item => item.type !== 'booking');

  // Эффект для форматирования времени при загрузке компонента
  useEffect(() => {
    console.log('Исходная строка времени:', bookingDetails.timeRange);
    
    // Ищем все числа в формате ЧЧ:ММ
    const timeMatches = bookingDetails.timeRange.match(/\d{1,2}:\d{2}/g);
    console.log('Найденные совпадения времени:', timeMatches);
    
    if (timeMatches && timeMatches.length >= 2) {
      // Используем только первые два совпадения
      setFormattedTime(`${timeMatches[0]} - ${timeMatches[1]}`);
    } else if (timeMatches && timeMatches.length === 1) {
      // Если найдено только одно время, используем его
      setFormattedTime(timeMatches[0]);
    } else {
      // В крайнем случае используем исходную строку
      setFormattedTime(bookingDetails.timeRange);
    }
  }, [bookingDetails.timeRange]);

  const sendBookingToAPI = async (bookingData: any) => {
    // Разбираем времена начала и окончания
    const parseTimeValue = (timeStr: string, type: 'start' | 'end'): string => {
      try {
        if (!timeStr) return '';
        
        // Используем регулярные выражения для извлечения всех времен в формате HH:MM
        const timeMatches = timeStr.match(/\d{1,2}:\d{2}/g);
        
        if (!timeMatches || timeMatches.length === 0) {
          return '';
        }
        
        // Если нашли два времени, берем первое для начала, второе для конца
        if (timeMatches.length >= 2) {
          return type === 'start' ? timeMatches[0] : timeMatches[1];
        }
        
        // Если нашли только одно время, используем его для обоих случаев
        return timeMatches[0];
      } catch (error) {
        console.error(`Ошибка при парсинге времени:`, error);
        return '';
      }
    };
    
    // Создание ISO строки даты с указанным временем
    const createDateWithTime = (baseDate: Date, timeStr: string): string => {
      try {
        if (!timeStr.match(/^\d{1,2}:\d{2}$/)) {
          throw new Error(`Неверный формат времени: ${timeStr}`);
        }
        
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error(`Неверное значение времени: ${hours}:${minutes}`);
        }
        
        // Клонируем базовую дату
        const date = new Date(baseDate.getTime());
        // Устанавливаем часы и минуты
        date.setHours(hours, minutes, 0, 0);
        
        if (isNaN(date.getTime())) {
          throw new Error(`Невалидная дата: ${date}`);
        }
        
        // Форматируем дату в ISO строку без миллисекунд
        const isoDate = date.toISOString().split('.')[0];
        return isoDate;
      } catch (error) {
        console.error(`Ошибка при создании даты:`, error);
        throw error;
      }
    };
    
    const startTimeStr = parseTimeValue(bookingData.startTime, 'start');
    const endTimeStr = parseTimeValue(bookingData.endTime || bookingData.startTime, 'end');
    
    if (!startTimeStr || !endTimeStr) {
      throw new Error('Некорректный формат времени');
    }
    
    // Создаем корректные даты ISO для API
    const startISODate = createDateWithTime(bookingData.selectedDate, startTimeStr);
    const endISODate = createDateWithTime(bookingData.selectedDate, endTimeStr);
    
    // Формируем данные для API
    const apiData = {
      telegramUserId: 0,
      telegramUserName: bookingData.telegramUserName?.startsWith('@') 
        ? bookingData.telegramUserName 
        : `@${bookingData.telegramUserName || ''}`,
      clientName: bookingData.name || '',
      clientPhone: (bookingData.phone || '').replace(/\+/g, ''),
      clientEmail: bookingData.email || '',
      start: startISODate,
      end: endISODate,
      service: bookingData.service 
        ? [{ 
            serviceName: bookingData.service.serviceName || '', 
            price: bookingData.service.price || 0 
          }] 
        : [],
      notes: ''
    };
    
    // Отправляем запрос на API
    const response = await fetch('https://backend.self-detailing.duckdns.org/api/v1/calendar/booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка сервера: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    // Отправляем сообщение в Telegram
    await sendTelegramMessage(
      formatAdminMessage(apiData, bookingData.service || { price: 0 }, bookingData.service?.serviceName || ''),
      ADMIN_CHAT_ID
    );
    
    return result;
  };

  const handleBooking = async (formData: any) => {
    try {
      await sendBookingToAPI(formData);
      navigate('/booking-success');
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
    }
  };

  // Форматируем дату, если она есть
  const formattedDate = bookingDetails.date instanceof Date 
    ? bookingDetails.date.toLocaleDateString('ru-RU') 
    : typeof bookingDetails.date === 'string' 
      ? new Date(bookingDetails.date).toLocaleDateString('ru-RU')
      : 'Дата не указана';

  return (
    <div className={styles.successPage}>
      <h1>Бронирование успешно создано!</h1>
      <p>Спасибо за ваш заказ. Мы свяжемся с вами в ближайшее время.</p>
      
      <div className={styles.bookingDetails}>
        <h2>Детали бронирования:</h2>
        <p><strong>Дата:</strong> {formattedDate}</p>
        <p><strong>Время:</strong> {formattedTime}</p>
        <p><strong>Услуга:</strong> {bookingDetails.plan.title}</p>
        <p><strong>Итоговая стоимость:</strong> {bookingDetails.totalPrice} ₽</p>
      </div>
      
      {products.length > 0 && (
        <div className={styles.productsSection}>
          <h2>Выбранные товары:</h2>
          <ul className={styles.productsList}>
            {products.map(product => (
              <li key={product.id} className={styles.productItem}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productQuantity}>× {product.quantity}</span>
                <span className={styles.productPrice}>{product.price * product.quantity} ₽</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className={styles.buttonGroup}>
        <button 
          onClick={() => {
            clearCart(); // Очищаем корзину
            navigate('/');
          }}
          className={styles.homeButton}
        >
          Вернуться на главную
        </button>
      </div>
    </div>
  );
};

export default BookingSuccess; 