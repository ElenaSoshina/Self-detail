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
  // Создаем множество слотов, входящих в выбранный диапазон
  const getSelectedRange = (): Set<string> => {
    const selectedRange = new Set<string>();
    
    if (startTime && endTime) {
      const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
      const endIdx = allDaySlots.findIndex(s => s.formattedTime === endTime);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        for (let i = from; i <= to; i++) {
          const time = allDaySlots[i].formattedTime;
          if (availableTimeSlots.includes(time)) selectedRange.add(time);
        }
      }
    } else if (startTime) {
      selectedRange.add(startTime);
    }
    
    return selectedRange;
  };

  // Определение, можно ли выбрать временной диапазон от startTime до текущего слота
  const isValidEndTime = (slot: string): boolean => {
    if (!startTime) return true;
    
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    const slotIdx = allDaySlots.findIndex(s => s.formattedTime === slot);
    
    // Проверка, что slot не раньше startTime
    if (slotIdx <= startIdx) return false;
    
    // Проверка на наличие недоступных слотов в диапазоне
    for (let i = startIdx; i <= slotIdx; i++) {
      if (!availableTimeSlots.includes(allDaySlots[i].formattedTime)) {
        return false;
      }
    }
    
    return true;
  };

  // Функция для сброса выбранного времени
  const resetTimeSelection = () => {
    onTimeSlotClick("reset"); // Специальное значение, которое будет обработано в родительском компоненте
  };

  const selectedRange = getSelectedRange();

  return (
    <div className={styles.timeSelection}>
      {selectedDate ? (
        <>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{formatDate(selectedDate)}</h3>
            {startTime && (
              <button 
                className={styles.resetButton} 
                onClick={resetTimeSelection}
              >
                Сбросить
              </button>
            )}
          </div>

          {loadingSlots ? (
            <div className={styles.loadingMessage}>Загрузка доступных слотов...</div>
          ) : slotsError ? (
            <div className={styles.errorMessage}>{slotsError}</div>
          ) : allDaySlots.length > 0 ? (
            <div className={styles.timeSlots}>
              {allDaySlots.map(slot => {
                const isAvailable = availableTimeSlots.includes(slot.formattedTime);
                const isSelected = selectedRange.has(slot.formattedTime);
                const isValidChoice = startTime && !endTime ? isValidEndTime(slot.formattedTime) : true;
                
                // Для наглядности подсветим красным невозможные для выбора слоты
                const isInvalidSelection = startTime && !endTime && !isValidChoice && isAvailable;
                
                return (
                  <button
                    key={slot.formattedTime}
                    className={`
                      ${styles.timeSlot}
                      ${isSelected ? styles.selectedTime : ''}
                      ${!isAvailable ? styles.timeSlotUnavailable : ''}
                      ${isInvalidSelection ? styles.invalidSelection : ''}
                    `}
                    onClick={() => isAvailable && isValidChoice && onTimeSlotClick(slot.formattedTime)}
                    disabled={!isAvailable || (isInvalidSelection ? true : false)}
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