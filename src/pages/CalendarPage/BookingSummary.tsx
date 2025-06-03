import React from 'react';
import styles from './CalendarPage.module.css';
import { PricingPlan } from './calendarTypes';

interface BookingSummaryProps {
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  selectedPlan: PricingPlan;
  onBook: () => void;
  formatDate: (date: Date) => string;
  getDateRange: () => string;
  editMode?: boolean;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  startTime,
  endTime,
  duration,
  selectedPlan,
  onBook,
  formatDate,
  getDateRange,
  editMode = false
}) => {
  if (!duration) return null;
  
  return (
    <div className={styles.totalPriceSection}>
      <div className={styles.summaryInfo}>
        <div>
          <b>Дата:</b> {getDateRange()}
        </div>
        <div>
          <b>Время:</b> {startTime} — {endTime}
        </div>
        <div>
          <b>Продолжительность:</b> {duration.toFixed(2)} ч.
        </div>
        <div>
          <b>Тариф:</b> {selectedPlan.title}
        </div>
      </div>
      <div className={styles.totalPrice}>
        <span>Итого:</span>
        <span className={styles.priceValue}>{selectedPlan.price * duration} ₽</span>
      </div>
      <button className={styles.bookButton} onClick={onBook}>
        {editMode ? 'Изменить бронирование' : 'Забронировать'}
      </button>
    </div>
  );
};

export default BookingSummary; 