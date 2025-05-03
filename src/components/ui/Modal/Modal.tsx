import React, { useEffect, useState, useRef } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  preventCloseOnBackdrop?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title = 'Модальное окно',
  children,
  preventCloseOnBackdrop = false,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Блокируем скролл на странице при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Отслеживаем фокус внутри модального окна
      const handleFocus = () => setIsFocused(true);
      const handleBlur = () => setIsFocused(false);
      
      // Отслеживаем события focus и blur для всех полей ввода
      const inputElements = modalRef.current?.querySelectorAll('input, textarea');
      inputElements?.forEach(el => {
        el.addEventListener('focus', handleFocus);
        el.addEventListener('blur', handleBlur);
      });
      
      return () => {
        document.body.style.overflow = 'auto';
        inputElements?.forEach(el => {
          el.removeEventListener('focus', handleFocus);
          el.removeEventListener('blur', handleBlur);
        });
      };
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !preventCloseOnBackdrop && !isFocused) {
      handleClose();
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className={`${styles.modalOverlay} ${isClosing ? styles.closing : ''}`}
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={`${styles.modalContent} ${isClosing ? styles.closing : ''}`}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 