import React, { useEffect } from 'react';
import styles from './CalendarConfirmModal.module.css';
import { openGoogleCalendar } from '../../utils/calendarLinks';
import { openICS as openAppleCalendar, shouldShowAppleCalendar } from '../../utils/calendarUtils';
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
  // Проверяем, нужно ли показывать кнопку Apple Calendar
  const showAppleCalendar = shouldShowAppleCalendar();
  
  useEffect(() => {
    if (isOpen) {
      // Инициализируем авторизацию сразу при открытии окна
      initAuth().catch(err => 
        console.error(`Ошибка получения токена авторизации: ${err.message}`)
      );
      
      console.log(`Модальное окно календаря отрисовано: bookingId=${bookingId}`, event);
    }
  }, [isOpen, bookingId, event]);

  console.log('CalendarConfirmModal render:', { isOpen, bookingId, event, showAppleCalendar });

  if (!isOpen) return null;

  // Проверяем валидность bookingId
  if (!bookingId || isNaN(Number(bookingId))) {
    console.error('Неверный ID бронирования:', bookingId);
    alert('Ошибка: неверный ID бронирования.');
    onClose();
    return null;
  }

  const handleAppleCalendar = () => {
    console.log('Нажата кнопка Apple/iOS Calendar', { bookingId });
    
    try {
      // Показываем индикатор загрузки
      const loadingIndicator = document.querySelector('button.icalBtn') as HTMLButtonElement;
      if (loadingIndicator) {
        loadingIndicator.disabled = true;
        loadingIndicator.textContent = 'Загрузка...';
      }
      
      // Проверяем валидность bookingId
      if (!bookingId || bookingId <= 0) {
        throw new Error('Неверный ID бронирования');
      }
      
      // Открываем ICS файл через внешний браузер
      openAppleCalendar(bookingId);
      
      // Завершаем процесс, вызываем колбэк
      onConfirm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('Ошибка при обработке Apple Calendar:', error);
      alert(`Ошибка при открытии Apple календаря: ${errorMessage}`);
    } finally {
      // Восстанавливаем кнопку
      const loadingIndicator = document.querySelector('button.icalBtn') as HTMLButtonElement;
      if (loadingIndicator) {
        loadingIndicator.disabled = false;
        loadingIndicator.textContent = 'Apple / iOS Calendar';
      }
    }
  };

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
          Выберите, куда добавить информацию о бронировании:
        </p>

        <div className={styles.buttonGroup}>
          {/* Показываем кнопку Apple Calendar только на устройствах Apple */}
          {showAppleCalendar && (
            <button
              className={styles.icalBtn || styles.confirmButton}
              onClick={handleAppleCalendar}
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : 'Apple / iOS Calendar'}
            </button>
          )}

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
