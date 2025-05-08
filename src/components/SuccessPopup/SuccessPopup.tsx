import React from 'react';
import styles from './SuccessPopup.module.css';

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.icon}>✓</div>
        <h2>Бронирование успешно добавлено</h2>
        <button onClick={onClose} className={styles.closeButton}>
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default SuccessPopup; 