import React from 'react';
import styles from './BookButton.module.css';

interface BookButtonProps {
  onClick?: () => void;
}

const BookButton: React.FC<BookButtonProps> = ({ onClick }) => {
  return (
    <button className={styles.bookButton} onClick={onClick}>
      <span className={styles.buttonIcon}>📅</span>
      Забронировать бокс
    </button>
  );
};

export default BookButton; 