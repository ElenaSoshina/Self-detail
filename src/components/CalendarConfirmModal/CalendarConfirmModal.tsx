import React from 'react';
import styles from './CalendarConfirmModal.module.css';
import { buildGoogleLink } from '../../utils/calendarUtils';

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
  if (!isOpen) return null;

  const googleHref = buildGoogleLink(
    event.title,
    event.description,
    event.location,
    event.start,
    event.end
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>Добавить в календарь?</h3>
        <p>Выберите, куда добавить:</p>

        <div className={styles.buttonGroup}>
          <button
            className={styles.icalBtn}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Apple / iCal'}
          </button>

          <a
            className={styles.googleBtn}
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Calendar
          </a>

          <button className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarConfirmModal;
