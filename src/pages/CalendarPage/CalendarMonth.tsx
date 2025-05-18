import React from 'react';
import styles from './CalendarPage.module.css';
interface Day {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isAvailable: boolean;
}

interface CalendarMonthProps {
  days: Day[];
  selectedDate: Date | null;
  onDateClick: (day: Day) => void;
  isSameDay: (d1: Date, d2: Date) => boolean;
}

const CalendarMonth: React.FC<CalendarMonthProps> = ({ days, selectedDate, onDateClick, isSameDay }) => (
  <div className={styles.daysGrid}>
    {days.map((day, idx) => (
      <div
        key={idx}
        className={`
          ${styles.day}
          ${!day.isCurrentMonth ? styles.otherMonth : ''}
          ${day.isAvailable ? styles.available : styles.unavailable}
          ${day.isToday ? styles.today : ''}
          ${selectedDate && isSameDay(day.date, selectedDate) ? styles.selected : ''}
        `}
        onClick={() => onDateClick(day)}
      >
        {day.date.getDate()}
      </div>
    ))}
  </div>
);

export default CalendarMonth;
