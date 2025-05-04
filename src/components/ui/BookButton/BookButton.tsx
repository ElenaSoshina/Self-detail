import React from 'react';
import styles from './BookButton.module.css';
import { useNavigate } from 'react-router-dom';

interface BookButtonProps {
  onClick?: () => void;
}

const BookButton: React.FC<BookButtonProps> = ({ onClick }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/calendar');
    }
  };
  
  return (
    <button className={styles.bookButton} onClick={handleClick}>
      <span className={styles.buttonIcon}>📅</span>
      Забронировать бокс
    </button>
  );
};

export default BookButton; 