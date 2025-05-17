import React, { useEffect } from 'react';
import styles from './CalendarConfirmModal.module.css';
import { openGoogleCalendar } from '../../utils/calendarLinks';
import { openICS } from '../../utils/calendarUtils';
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
        alert(`Ошибка получения токена авторизации: ${err.message}`)
      );
      
      alert(`Модальное окно календаря отрисовано: bookingId=${bookingId}`);
    }
  }, [isOpen, bookingId]);

  console.log('CalendarConfirmModal render:', { isOpen, bookingId, event });

  if (!isOpen) return null;

  alert(`CalendarConfirmModal активно с bookingId=${bookingId}`);

  const handleAppleCalendar = async () => {
    alert('Нажата кнопка Apple/iOS Calendar');
    
    try {
      // Показываем индикатор загрузки
      const loadingIndicator = document.querySelector('button.icalBtn') as HTMLButtonElement;
      if (loadingIndicator) {
        loadingIndicator.disabled = true;
        loadingIndicator.textContent = 'Загрузка...';
      }
      
      // Открываем ICS файл через прямую ссылку с токеном
      await openICS(bookingId);
      
      // Завершаем процесс, вызываем колбэк
      onConfirm();
    } catch (error) {
      alert(`Ошибка при открытии Apple календаря: ${(error as Error).message}`);
      console.error('Ошибка при обработке ICS:', error);
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
    alert('Нажата кнопка Google Calendar');
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
          <button
            className={styles.icalBtn || styles.confirmButton}
            onClick={handleAppleCalendar}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Apple / iOS Calendar'}
          </button>

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
