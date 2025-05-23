import React, { useEffect, useState } from 'react';
import styles from './CalendarPage.module.css';
import { TimeSlotData } from './calendarApiService';

interface TimeSlotsProps {
  selectedDate: Date | null;
  loadingSlots: boolean;
  slotsError: string | null;
  allDaySlots: { formattedTime: string; start: string; end: string }[];
  availableTimeSlots: string[];
  formatDate: (date: Date) => string;
  timeSlotData: TimeSlotData[];
  onRangeSelect: (start: string | null, end: string | null) => void;
  startTime: string | null;
  endTime: string | null;
}

const TimeSlots: React.FC<TimeSlotsProps> = ({
  selectedDate,
  loadingSlots,
  slotsError,
  allDaySlots,
  availableTimeSlots,
  formatDate,
  timeSlotData,
  onRangeSelect,
  startTime: externalStartTime,
  endTime: externalEndTime
}) => {
  const [startTime, setStartTime] = useState<string | null>(externalStartTime);
  const [endTime, setEndTime] = useState<string | null>(externalEndTime);

  useEffect(() => {
    setStartTime(externalStartTime);
    setEndTime(externalEndTime);
  }, [externalStartTime, externalEndTime]);

  // Функция для сброса выбранного времени
  const resetTimeSelection = () => {
    setStartTime(null);
    setEndTime(null);
    onRangeSelect(null, null);
  };

  // Проверка, доступен ли слот (явно указан в ответе API как доступный)
  const isSlotAvailable = (slotTime: string): boolean => {
    return availableTimeSlots.includes(slotTime);
  };

  // Проверка, является ли слот занятым (нет в availableTimeSlots)
  const isSlotBooked = (slotTime: string): boolean => {
    return !isSlotAvailable(slotTime);
  };

  // Проверка, является ли слот границей (первый занятый после свободного)
  const isBoundary = (slotTime: string): boolean => {
    const idx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    if (idx === -1) return false;
    if (!isSlotBooked(slotTime)) return false;
    // Если предыдущий слот свободен
    if (idx > 0 && isSlotAvailable(allDaySlots[idx - 1].formattedTime)) return true;
    return false;
  };

  // Проверка, может ли слот быть выбран как начало диапазона
  const canBeSelectedAsStart = (slotTime: string): boolean => {
    return isSlotAvailable(slotTime);
  };

  // Проверка, может ли слот быть выбран как конец диапазона (если это граница и выбран предыдущий свободный)
  const canBeSelectedAsEnd = (slotTime: string): boolean => {
    if (isSlotAvailable(slotTime)) return true;
    const idx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    if (idx === -1 || !startTime) return false;
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    if (startIdx === -1 || idx <= startIdx) return false;
    // Проверяем, что все промежуточные слоты свободны
    for (let i = startIdx + 1; i < idx; i++) {
      if (isSlotBooked(allDaySlots[i].formattedTime)) return false;
    }
    return true;
  };

  // Проверка, может ли слот быть выбран как граница диапазона (для универсальности)
  const canBeSelectedAsBoundary = (slotTime: string): boolean => {
    return canBeSelectedAsEnd(slotTime);
  };

  // Проверка, находится ли слот до выбранного начала
  const isBeforeStart = (slotTime: string): boolean => {
    if (!startTime) return false;
    const idx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    return idx < startIdx;
  };

  // Проверка, находится ли слот после первого занятого после startTime
  const isAfterFirstBooked = (slotTime: string): boolean => {
    if (!startTime) return false;
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    let firstBookedIdx = -1;
    for (let i = startIdx + 1; i < allDaySlots.length; i++) {
      if (isSlotBooked(allDaySlots[i].formattedTime)) {
        firstBookedIdx = i;
        break;
      }
    }
    if (firstBookedIdx === -1) return false;
    const idx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    return idx > firstBookedIdx;
  };

  // Обработчик клика по слоту
  const handleSlotClick = (time: string) => {
    if (loadingSlots) return;
    if (isPastSlot(time)) return;

    // Если слот занят, разрешаем только как конец диапазона (если выбран предыдущий свободный)
    if (isSlotBooked(time) && !canBeSelectedAsEnd(time)) return;

    // сброс, если нажали на уже выбранное начало
    if (startTime === time) {
      resetTimeSelection();
      return;
    }

    // если нет начала или диапазон уже закончен ⇒ начинаем новый выбор
    if (!startTime || endTime) {
      if (canBeSelectedAsStart(time)) {
        setStartTime(time);
        setEndTime(null);
        onRangeSelect(time, null);
      }
      return;
    }

    // второй клик – пытаемся поставить конец
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    const endIdx = allDaySlots.findIndex(s => s.formattedTime === time);
    if (endIdx <= startIdx) return;

    if (!canBeSelectedAsEnd(time)) return;

    // Проверяем, есть ли занятые слоты между start и end (кроме самого end)
    let hasBookedSlots = false;
    for (let i = startIdx + 1; i < endIdx; i++) {
      const currentSlot = allDaySlots[i].formattedTime;
      if (isSlotBooked(currentSlot)) {
        hasBookedSlots = true;
        break;
      }
    }

    // Устанавливаем конец только если:
    // 1. Все промежуточные слоты свободны, или
    // 2. Это соседний слот сразу после начального
    if (!hasBookedSlots || endIdx === startIdx + 1) {
      setEndTime(time);
      onRangeSelect(startTime, time);
    }
  };

  // Проверка, является ли слот прошедшим (для сегодняшней даты)
  const isPastSlot = (slotTime: string) => {
    if (!selectedDate) return false;
    
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    if (!isToday) return false;
    
    const [slotHour, slotMinute] = slotTime.split(":").map(Number);
    const slotDate = new Date(selectedDate);
    slotDate.setHours(slotHour, slotMinute, 0, 0);
    
    // Добавляем небольшой отступ (5 минут) для слотов, которые скоро наступят
    const buffer = 5 * 60 * 1000; // 5 минут в миллисекундах
    return slotDate.getTime() <= (now.getTime() + buffer);
  };

  // Проверка, находится ли слот в выбранном промежутке
  const isInSelectedRange = (slotTime: string) => {
    if (!startTime || !endTime) return false;
    
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    const endIdx = allDaySlots.findIndex(s => s.formattedTime === endTime);
    const currentIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    
    return currentIdx > startIdx && currentIdx < endIdx;
  };

  return (
    <div className={styles.timeSelection}>
      {selectedDate ? (
        <>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{formatDate(selectedDate)}</h3>
            {(startTime || endTime) && (
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
                const isStart = startTime === slot.formattedTime;
                const isEnd = endTime === slot.formattedTime;
                const isInRange = isInSelectedRange(slot.formattedTime);
                const hasBoundary = isBoundary(slot.formattedTime);
                const isSelected = isStart || isEnd || isInRange;
                const isEdge = isStart || isEnd;
                const past = isPastSlot(slot.formattedTime);
                const isAvailable = isSlotAvailable(slot.formattedTime);
                const isBooked = isSlotBooked(slot.formattedTime);
                const isSelectableAsBoundary = canBeSelectedAsBoundary(slot.formattedTime);
                const isPrevious = false; // убираем, если был
                const isBefore = isBeforeStart(slot.formattedTime);
                const isAfterBooked = isAfterFirstBooked(slot.formattedTime);

                return (
                  <button
                    key={slot.formattedTime}
                    className={`
                      ${styles.timeSlot}
                      ${isSelected ? styles.timeSlotActive : ''}
                      ${isEdge ? styles.timeSlotSelectedEdge : ''}
                      ${hasBoundary ? styles.timeSlotBoundary : ''}
                      ${(isBooked && !hasBoundary && !isSelected && !isSelectableAsBoundary) ? styles.timeSlotUnavailableRed : ''}
                      ${isBefore ? styles.timeSlotBeforeStart : ''}
                      ${isAfterBooked ? styles.timeSlotAfterBooked : ''}
                    `}
                    onClick={() => !past && !isBefore && !isAfterBooked && handleSlotClick(slot.formattedTime)}
                    disabled={past || isBefore || isAfterBooked || (isBooked && !isSelectableAsBoundary)}
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