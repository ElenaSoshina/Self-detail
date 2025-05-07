import React from 'react';
import styles from './CalendarPage.module.css';

interface TimeSlotsProps {
  selectedDate: Date | null;
  loadingSlots: boolean;
  slotsError: string | null;
  allDaySlots: { formattedTime: string; start: string; end: string }[];
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
  allDaySlots,
  availableTimeSlots,
  startTime,
  endTime,
  onTimeSlotClick,
  formatDate
}) => {
  let selectedRange: Set<string> = new Set();
  if (startTime && endTime) {
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    const endIdx = allDaySlots.findIndex(s => s.formattedTime === endTime);
    if (startIdx !== -1 && endIdx !== -1) {
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      for (let i = from; i <= to; i++) {
        selectedRange.add(allDaySlots[i].formattedTime);
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
          ) : allDaySlots.length > 0 ? (
            <div className={styles.timeSlots}>
              {allDaySlots.map(slot => {
                const isAvailable = availableTimeSlots.includes(slot.formattedTime);
                return (
                  <button
                    key={slot.formattedTime}
                    className={
                      styles.timeSlot +
                      (selectedRange.has(slot.formattedTime) ? ' ' + styles.selectedTime : '') +
                      (!isAvailable ? ' ' + styles.timeSlotUnavailable : '')
                    }
                    onClick={() => isAvailable && onTimeSlotClick(slot.formattedTime)}
                    disabled={!isAvailable}
                  >
                    {slot.formattedTime}
                  </button>
                );
              })}
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