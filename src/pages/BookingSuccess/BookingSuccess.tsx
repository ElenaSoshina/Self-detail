import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BookingSuccess.module.css';
import { BookingDetails } from '../CalendarPage/calendarTypes';
import { useCart } from '../../context/CartContex';

interface BookingSuccessProps {
  bookingDetails: BookingDetails;
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ bookingDetails }) => {
  const navigate = useNavigate();
  const [formattedTime, setFormattedTime] = useState('');
  const { items, clearCart } = useCart();
  
  // Получаем товары из корзины (всё, кроме бронирования)
  const products = items.filter(item => item.type !== 'booking');

  // Эффект для форматирования времени при загрузке компонента
  useEffect(() => {
    // Ищем все числа в формате ЧЧ:ММ
    const timeMatches = bookingDetails.timeRange.match(/\d{1,2}:\d{2}/g);
    
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

  // Форматируем дату, если она есть
  const formattedDate = bookingDetails.date instanceof Date 
    ? bookingDetails.date.toLocaleDateString('ru-RU') 
    : typeof bookingDetails.date === 'string' 
      ? new Date(bookingDetails.date).toLocaleDateString('ru-RU')
      : 'Дата не указана';

  // Извлекаем время из строки времени
  const extractTimeFromRange = (timeRange: string) => {
    
    // Ищем все вхождения времени в формате HH:MM
    const timeMatches = timeRange.match(/\d{1,2}:\d{2}/g);
    
    if (timeMatches && timeMatches.length >= 2) {
      return {
        startTime: timeMatches[0],
        endTime: timeMatches[1]
      };
    }
    
    // Если не удалось извлечь время, возвращаем пустые строки
    return {
      startTime: '',
      endTime: ''
    };
  };

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