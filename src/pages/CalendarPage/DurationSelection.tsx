import React from 'react';
import styles from './CalendarPage.module.css';

interface DurationSelectionProps {
  hours: number;
  maxAvailableHours: number;
  onHoursChange: (newHours: number) => void;
  totalPrice: number;
  onBook: () => void;
}

const DurationSelection: React.FC<DurationSelectionProps> = ({
  hours,
  maxAvailableHours,
  onHoursChange,
  totalPrice,
  onBook
}) => (
  <div className={styles.durationSelection}>
    <h3 className={styles.sectionTitle}>Выберите продолжительность</h3>
    <div className={styles.hoursControls}>
      <button
        className={styles.hoursButton}
        onClick={() => onHoursChange(hours - 1)}
        disabled={hours <= 1}
      >
        -
      </button>
      <div className={styles.hoursDisplay}>
        <span className={styles.hoursValue}>{hours}</span> ч.
      </div>
      <button
        className={styles.hoursButton}
        onClick={() => onHoursChange(hours + 1)}
        disabled={hours >= maxAvailableHours}
      >
        +
      </button>
    </div>
    {maxAvailableHours < 8 && (
      <div className={styles.availabilityInfo}>
        В выбранное время бронирование возможно только на {maxAvailableHours} {maxAvailableHours === 1 ? 'час' : maxAvailableHours < 5 ? 'часа' : 'часов'}
      </div>
    )}
    <div className={styles.totalPrice}>
      <span>Итого:</span>
      <span className={styles.priceValue}>{totalPrice} ₽</span>
    </div>
    <button className={styles.bookButton} onClick={onBook}>
      Забронировать
    </button>
  </div>
);

export default DurationSelection; 