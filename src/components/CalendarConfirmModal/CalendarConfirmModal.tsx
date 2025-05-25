import React, { useEffect } from 'react';
import styles from './CalendarConfirmModal.module.css';
import { openGoogleCalendar } from '../../utils/calendarLinks';
import { initAuth } from '../../api/apiService';

// расширяем глобальный объект, чтобы TypeScript не ругался
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        close: () => void;
      };
    };
  }
}

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

/** безопасно закрываем Telegram‑Web‑App (если открыт в Telegram) */
const closeTgWebApp = () => {
  window.Telegram?.WebApp?.close?.();
};

const CalendarConfirmModal: React.FC<Props> = ({
                                                 isOpen,
                                                 bookingId,
                                                 event,
                                                 isLoading,
                                                 onConfirm,
                                                 onClose,
                                               }) => {
  useEffect(() => {
    if (isOpen && bookingId && event) {
      // Модальное окно календаря отрисовано
    }
  }, [isOpen, bookingId, event]);

  if (!isOpen) return null;

  // некорректный id — сразу закрываем
  if (!bookingId || Number.isNaN(Number(bookingId))) {
    console.error('Неверный ID бронирования:', bookingId);
    onClose();
    return null;
  }

  const handleGoogleCalendar = () => {
    if (!event) return;
    
    const startTime = event.start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = event.end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`;
    
    window.open(googleCalendarUrl, '_blank');
    onConfirm();
    closeTgWebApp();
  };

  const handleCancel = () => {
    onClose();
    closeTgWebApp();
  };

  return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h3 className={styles.modalTitle}>Добавить в календарь?</h3>
          <p className={styles.modalText}>Добавьте информацию о бронировании в свой календарь</p>

          <div className={styles.buttonGroup}>
            <button
                className={styles.googleBtn || styles.confirmButton}
                onClick={handleGoogleCalendar}
                disabled={isLoading}
            >
              Google Calendar
            </button>

            <button
                className={styles.cancelBtn || styles.cancelButton}
                onClick={handleCancel}
                disabled={isLoading}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
  );
};

export default CalendarConfirmModal;
