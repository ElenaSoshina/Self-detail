import React from 'react';
import styles from './CalendarConfirmModal.module.css';
import { openICS, buildGoogleLink } from '../../utils/calendarUtils';

interface CalendarConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookingId: number | null;
  eventDetails: {
    title: string;
    description: string;
    location: string;
    start: Date;
    end: Date;
  } | null;
  isLoading: boolean;
}

const CalendarConfirmModal: React.FC<CalendarConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  eventDetails,
  isLoading
}) => {
  if (!isOpen || !bookingId || !eventDetails) return null;

  const googleHref = buildGoogleLink(
    eventDetails.title,
    eventDetails.description,
    eventDetails.location,
    eventDetails.start,
    eventDetails.end
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Добавить в календарь?</h3>
        <p className={styles.modalText}>
          Выберите вариант, чтобы сохранить бронирование в вашем календаре.
        </p>
        <div className={styles.buttonGroup}>
          <button
            onClick={onConfirm}
            className={styles.confirmButton}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Apple/iCal'}
          </button>
          <a
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.googleButton}
          >
            Google Calendar
          </a>
          <button
            onClick={onClose}
            className={styles.cancelButton}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarConfirmModal;
