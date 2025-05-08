import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BookingModal from '../../components/BookingModal/BookingModal';
import { createBooking } from '../../api/booking';
import styles from './BookingSuccess.module.css';

const BookingSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const bookingData = location.state?.bookingData;

  const handleBooking = async (formData: any) => {
    try {
      await createBooking(formData);
      navigate('/booking-success');
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
    }
  };

  return (
    <div className={styles.successPage}>
      <h1>Бронирование успешно создано!</h1>
      <p>Спасибо за ваш заказ. Мы свяжемся с вами в ближайшее время.</p>
      
      <div className={styles.buttonGroup}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className={styles.confirmButton}
        >
          Подтвердить бронирование
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className={styles.homeButton}
        >
          Вернуться на главную
        </button>
      </div>

      {isModalOpen && bookingData && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          startTime={bookingData.start}
          endTime={bookingData.end}
          service={bookingData.service}
          onSubmit={handleBooking}
        />
      )}
    </div>
  );
};

export default BookingSuccess; 