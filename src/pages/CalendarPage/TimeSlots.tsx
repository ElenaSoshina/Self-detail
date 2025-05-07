import React from 'react';
import styles from './CalendarPage.module.css';

interface TimeSlotsProps {
  selectedDate: Date | null;
  loadingSlots: boolean;
  slotsError: string | null;
  availableTimeSlots: string[];
  startTime: string | null;
  endTime: string | null;
  onTimeSlotClick: (time: string) => void;
  formatDate: (date: Date) => string;
}

const TimeSlots: React.FC<TimeSlotsProps> = ({
  selectedDate,
  loadingSlots,
  slotsError,
  availableTimeSlots,
  startTime,
  endTime,
  onTimeSlotClick,
  formatDate
}) => {
  let selectedRange: Set<string> = new Set();
  if (startTime && endTime) {
    const startIdx = availableTimeSlots.indexOf(startTime);
    const endIdx = availableTimeSlots.indexOf(endTime);
    if (startIdx !== -1 && endIdx !== -1) {
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      for (let i = from; i <= to; i++) {
        selectedRange.add(availableTimeSlots[i]);
      }
    }
  } else if (startTime) {
    selectedRange.add(startTime);
  }

  return (
    <div className={styles.timeSelection}>
      {selectedDate ? (
        <>
          <h3 className={styles.sectionTitle}>{formatDate(selectedDate)}</h3>
          {loadingSlots ? (
            <div className={styles.loadingMessage}>Загрузка доступных слотов...</div>
          ) : slotsError ? (
            <div className={styles.errorMessage}>{slotsError}</div>
          ) : availableTimeSlots.length > 0 ? (
            <div className={styles.timeSlots}>
              {availableTimeSlots.map(time => (
                <button
                  key={time}
                  className={
                    styles.timeSlot +
                    (selectedRange.has(time) ? ' ' + styles.selectedTime : '')
                  }
                  onClick={() => onTimeSlotClick(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.noTimeSlotsMessage}>Нет доступных слотов на выбранную дату</div>
          )}
        </>
      ) : (
        <div className={styles.loadingMessage}>Загрузка свободных слотов...</div>
      )}
    </div>
  );
};

export default TimeSlots; 