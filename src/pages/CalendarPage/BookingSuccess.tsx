import React, { useState } from 'react';
import styles from './CalendarPage.module.css';
import { BookingDetails } from './calendarTypes';
import BookingModal from '../../components/BookingModal/BookingModal';

interface BookingSuccessProps {
  bookingDetails: BookingDetails;
  formatDate: (date: Date) => string;
  goToProducts: () => void;
  addBookingToCart: () => void;
  onBack: () => void;
}

const serviceMap = {
  'Мойка авто':   { serviceName: 'wash_car', price: 800 },
  'Сухой пост':   { serviceName: 'dry_post', price: 500 },
  'Химчистка':    { serviceName: 'dry_cleaning', price: 800 },
  'Полировка':    { serviceName: 'polish', price: 800 }
};

const BookingSuccess: React.FC<BookingSuccessProps> = ({ bookingDetails, formatDate, goToProducts, addBookingToCart, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Бронирование выполнено успешно!</h2>
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
        <h3 className={styles.productsTitle}>Хотите добавить товары для бокса?</h3>
        <p className={styles.productsDescription}>
          Вы можете выбрать дополнительные средства, которые будут вас ждать в боксе.
        </p>
        <div className={styles.actionButtons}>
          <button className={styles.skipButton} onClick={onBack}>
            Изменить бронирование
          </button>
          <button className={styles.addProductsButton} onClick={goToProducts}>
            Добавить товары
          </button>
          <button className={styles.skipButton} onClick={addBookingToCart}>
            Нет, спасибо
          </button>
          <button 
            className={styles.confirmButton} 
            onClick={() => setIsModalOpen(true)}
          >
            Подтвердить бронирование
          </button>
        </div>
      </div>

      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          startTime={bookingDetails.timeRange.split(' - ')[0]}
          endTime={bookingDetails.timeRange.split(' - ')[1]}
          service={{
            serviceName: bookingDetails.plan.title,
            price: bookingDetails.totalPrice
          }}
          onSubmit={handleBooking}
          selectedDate={bookingDetails.date}
        />

      )}
    </div>
  );
};

export default BookingSuccess; 