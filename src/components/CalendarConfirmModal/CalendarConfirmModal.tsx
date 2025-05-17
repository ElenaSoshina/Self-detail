import React from 'react';
import styles from './CalendarConfirmModal.module.css';

interface CalendarConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookingId: number | null;
  isLoading: boolean;
}

const CalendarConfirmModal: React.FC<CalendarConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  isLoading
}) => {
  if (!isOpen || !bookingId) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Добавить бронирование в календарь?</h3>
        <p className={styles.modalText}>
          Вы сможете сохранить информацию о бронировании в ваш календарь.
        </p>
        <div className={styles.buttonGroup}>
          <button 
            onClick={onConfirm} 
            className={styles.confirmButton}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Добавить'}
          </button>
          <button 
            onClick={onClose}
            className={styles.cancelButton}
          >
            Нет
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarConfirmModal; 