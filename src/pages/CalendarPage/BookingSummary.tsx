import React from 'react';
import styles from './CalendarPage.module.css';
import { PricingPlan } from './calendarTypes';

interface BookingSummaryProps {
  selectedDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  selectedPlan: PricingPlan;
  onBook: () => void;
  formatDate: (date: Date) => string;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedDate,
  startTime,
  endTime,
  duration,
  selectedPlan,
  onBook,
  formatDate
}) => (
  <div className={styles.totalPriceSection}>
    <div className={styles.summaryInfo}>
      <div>
        <b>Дата:</b> {selectedDate ? formatDate(selectedDate) : '-'}
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
      Забронировать
    </button>
  </div>
);

export default BookingSummary; 