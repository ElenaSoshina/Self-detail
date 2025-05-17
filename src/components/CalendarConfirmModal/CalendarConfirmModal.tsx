import React, { useEffect } from 'react';
import styles from './CalendarConfirmModal.module.css';
import { openGoogleCalendar } from '../../utils/calendarLinks';
import { initAuth } from '../../api/apiService';

interface Props {
  isOpen: boolean;
  bookingId: number;
  event: {
    title: string;
    description: string;
    location: string;
    start: Date;
    end: Date;
  };
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const CalendarConfirmModal: React.FC<Props> = ({
  isOpen, bookingId, event, isLoading, onConfirm, onClose
}) => {
  useEffect(() => {
    if (isOpen) {
      // Инициализируем авторизацию сразу при открытии окна
      initAuth().catch(err => 
        console.error(`Ошибка получения токена авторизации: ${err.message}`)
      );
      
      console.log(`Модальное окно календаря отрисовано: bookingId=${bookingId}`, event);
    }
  }, [isOpen, bookingId, event]);

  console.log('CalendarConfirmModal render:', { isOpen, bookingId, event });

  if (!isOpen) return null;

  // Проверяем валидность bookingId
  if (!bookingId || isNaN(Number(bookingId))) {
    console.error('Неверный ID бронирования:', bookingId);
    alert('Ошибка: неверный ID бронирования.');
    onClose();
    return null;
  }

  const handleGoogleCalendar = () => {
    console.log('Нажата кнопка Google Calendar');
    openGoogleCalendar(
      event.title,
      event.description,
      event.location,
      event.start,
      event.end
    );
    onConfirm();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Добавить в календарь?</h3>
        <p className={styles.modalText}>
          Добавьте информацию о бронировании в свой календарь
        </p>

        <div className={styles.buttonGroup}>
          <button
            className={styles.googleBtn || styles.confirmButton}
            onClick={handleGoogleCalendar}
          >
            Google Calendar
          </button>

          <button
            className={styles.cancelBtn || styles.cancelButton}
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarConfirmModal;
