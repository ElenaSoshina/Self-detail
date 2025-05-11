import React, { useState } from 'react';
import styles from './CalendarPage.module.css';
import { BookingDetails } from './calendarTypes';
import BookingModal from '../../components/BookingModal/BookingModal';
import { useCart } from '../../context/CartContex';

interface BookingSuccessProps {
  bookingDetails: BookingDetails;
  formatDate: (date: Date) => string;
  goToProducts: () => void;
  addBookingToCart: () => void;
  onBack: () => void;
}

const serviceMap = {
  'Мойка авто':   { serviceName: 'Мойка авто', price: 800 },
  'Сухой пост':   { serviceName: 'Сухой пост', price: 500 },
  'Химчистка':    { serviceName: 'Химчистка', price: 800 },
  'Полировка':    { serviceName: 'Полировка', price: 800 }
};

const BookingSuccess: React.FC<BookingSuccessProps> = ({ bookingDetails, formatDate, goToProducts, addBookingToCart, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { items } = useCart();
  const products = items.filter(item => item.type !== 'booking');

  const handleBooking = async (formData: any) => {
    try {
      const selectedService = serviceMap[formData.service[0].serviceName as keyof typeof serviceMap];
      const bookingData = {
        // ...другие поля...
        service: [selectedService],
        notes: ''
      };
      // Здесь будет логика отправки данных на сервер
      console.log('Booking data: ', bookingData);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
    }
  };

  return (
    <div className={styles.bookingCompletedContainer}>
      <div className={styles.bookingSuccessCard}>
        <div className={styles.bookingDetails}>
          <div className={styles.bookingDetail}>
            <span className={styles.detailLabel}>Дата:</span>
            <span className={styles.detailValue}>{formatDate(bookingDetails.date)}</span>
          </div>
          <div className={styles.bookingDetail}>
            <span className={styles.detailLabel}>Время:</span>
            <span className={styles.detailValue}>{bookingDetails.timeRange}</span>
          </div>
          <div className={styles.bookingDetail}>
            <span className={styles.detailLabel}>Тариф:</span>
            <span className={styles.detailValue}>{bookingDetails.plan.title}</span>
          </div>
          <div className={styles.bookingDetail}>
            <span className={styles.detailLabel}>Продолжительность:</span>
            <span className={styles.detailValue}>{bookingDetails.duration.toFixed(2)} ч.</span>
          </div>
          <div className={styles.bookingDetail}>
            <span className={styles.detailLabel}>Стоимость:</span>
            <span className={styles.detailValue}>{bookingDetails.totalPrice} ₽</span>
          </div>
        </div>
        {products.length > 0 && (
          <div className={styles.productsSection}>
            <h3 className={styles.productsTitle}>Выбранные товары:</h3>
            <ul className={styles.productsList}>
              {products.map(product => (
                <li key={product.id} className={styles.productItem}>
                  <span className={styles.productName}>{product.name}</span>
                  <span className={styles.productQuantity}>x{product.quantity}</span>
                  <span className={styles.productPrice}>{product.price} ₽</span>
                  <span className={styles.productTotal}>{product.price * product.quantity} ₽</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button className={styles.gradientBorderButton} onClick={onBack}>
          Изменить
        </button>
        {/* <h3 className={styles.productsTitle}>Хотите добавить товары для бокса?</h3>
        <p className={styles.productsDescription}>
          Вы можете выбрать дополнительные средства, которые будут вас ждать в боксе.
        </p>
        <button className={styles.gradientBorderButton} onClick={goToProducts}>
          Добавить товары
        </button> */}
        <button 
          className={styles.confirmButtonWide} 
          onClick={() => setIsModalOpen(true)}
        >
          Подтвердить
        </button>
      </div>

      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          startTime={bookingDetails.timeRange.split(' - ')[0]}
          endTime={bookingDetails.timeRange.split(' - ')[1]}
          service={serviceMap[bookingDetails.plan.title as keyof typeof serviceMap]}
          onSubmit={handleBooking}
          selectedDate={bookingDetails.date}
        />
      )}
    </div>
  );
};

export default BookingSuccess; 