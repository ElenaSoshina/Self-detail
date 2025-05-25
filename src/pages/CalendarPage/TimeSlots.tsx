import React, { useEffect, useState } from 'react';
import styles from './CalendarPage.module.css';
import { TimeSlotData } from './calendarApiService';

interface TimeSlotsProps {
  selectedDate: Date | null;
  loadingSlots: boolean;
  slotsError: string | null;
  allDaySlots: { formattedTime: string; start: string; end: string }[];
  availableTimeSlots: string[];
  nextDayTimeSlots: string[];
  formatDate: (date: Date) => string;
  timeSlotData: TimeSlotData[];
  nextDayTimeSlotData: TimeSlotData[];
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
  nextDayTimeSlots,
  formatDate,
  timeSlotData,
  nextDayTimeSlotData,
  onRangeSelect,
  startTime: externalStartTime,
  endTime: externalEndTime
}) => {
  const [startTime, setStartTime] = useState<string | null>(externalStartTime);
  const [endTime, setEndTime] = useState<string | null>(externalEndTime);
  
  // Добавляем состояние для отслеживания контекста выбора
  const [startTimeContext, setStartTimeContext] = useState<'current' | 'next' | null>(null);
  const [endTimeContext, setEndTimeContext] = useState<'current' | 'next' | null>(null);

  useEffect(() => {
    console.log('=== TimeSlots useEffect triggered ===');
    console.log('External props:', { externalStartTime, externalEndTime });
    console.log('Current internal state:', { startTime, endTime });
    setStartTime(externalStartTime);
    setEndTime(externalEndTime);
    console.log('Updated internal state to:', { startTime: externalStartTime, endTime: externalEndTime });
  }, [externalStartTime, externalEndTime]);

  // Функция для сброса выбранного времени
  const resetTimeSelection = () => {
    setStartTime(null);
    setEndTime(null);
    setStartTimeContext(null);
    setEndTimeContext(null);
    onRangeSelect(null, null);
  };

  // Вспомогательная функция для проверки, доступен ли слот в текущем дне (включая граничные)
  const isSlotAvailableInCurrentDay = (slotTime: string): boolean => {
    // Проверяем, есть ли слот в доступных слотах текущего дня
    if (availableTimeSlots.includes(slotTime)) return true;
    
    // Проверяем, является ли слот граничным в текущем дне (может быть выбран как конец диапазона)
    const slotIndex = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    if (slotIndex === -1) return false;
    
    // Слот является граничным, если предыдущий слот доступен, а текущий - нет
    if (slotIndex > 0) {
      const prevSlot = allDaySlots[slotIndex - 1].formattedTime;
      return availableTimeSlots.includes(prevSlot) && !availableTimeSlots.includes(slotTime);
    }
    
    return false;
  };

  // Проверка, доступен ли слот (явно указан в ответе API как доступный)
  const isSlotAvailable = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (isNextDay) {
      // Для следующего дня проверяем доступность через nextDayTimeSlotData
      const slotData = nextDayTimeSlotData.find(data => data.formattedTime === slotTime);
      return slotData ? slotData.available : false;
    }
    return availableTimeSlots.includes(slotTime);
  };

  // Проверка, является ли слот занятым (нет в availableTimeSlots)
  const isSlotBooked = (slotTime: string, isNextDay: boolean = false): boolean => {
    return !isSlotAvailable(slotTime, isNextDay);
  };

  // Проверка, является ли слот границей (первый занятый после свободного)
  const isBoundary = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (isNextDay) {
      // Для следующего дня проверяем границы в nextDayTimeSlots
      const idx = nextDayTimeSlots.findIndex(s => s === slotTime);
      if (idx === -1) return false;
      if (!isSlotBooked(slotTime, true)) return false;
      // Если предыдущий слот свободен
      if (idx > 0 && isSlotAvailable(nextDayTimeSlots[idx - 1], true)) return true;
      return false;
    }
    
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
  const canBeSelectedAsEnd = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (isSlotAvailable(slotTime, isNextDay)) return true;
    if (!startTime) return false;
    
    // Проверяем, где находится startTime - в текущем или следующем дне
    const startTimeInNextDay = nextDayTimeSlots.includes(startTime);
    
    // Если startTime в следующем дне
    if (startTimeInNextDay) {
      // Нельзя выбирать слоты текущего дня (назад во времени)
      if (!isNextDay) return false;
      
      // Можно выбирать только слоты следующего дня после startTime
      if (isNextDay) {
        const startIdx = nextDayTimeSlots.findIndex(s => s === startTime);
        const endIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
        
        if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return false;
        
        // Если это граничный слот и он идет сразу после startTime - разрешаем
        if (isBoundary(slotTime, true) && endIdx === startIdx + 1) {
          return true;
        }
        
        // Проверяем промежуточные слоты в следующем дне
        for (let i = startIdx + 1; i < endIdx; i++) {
          const checkSlot = nextDayTimeSlots[i];
          if (!isSlotAvailable(checkSlot, true)) return false;
        }
        return true;
      }
      return false;
    }
    
    // Если startTime в текущем дне
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    if (startIdx === -1) return false;

    // Если это слот следующего дня
    if (isNextDay) {
      // Сначала проверяем, есть ли занятые слоты после startTime в текущем дне
      for (let i = startIdx + 1; i < allDaySlots.length; i++) {
        if (isSlotBooked(allDaySlots[i].formattedTime)) {
          // Если есть занятый слот после startTime в текущем дне - 
          // нельзя переходить на следующий день, так как будет наложение
          return false;
        }
      }
      
      // Если это граничный слот следующего дня - разрешаем выбор
      if (isBoundary(slotTime, true)) {
        return true;
      }
      
      // Если все слоты после startTime в текущем дне свободны,
      // проверяем слоты следующего дня до целевого времени
      const endIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
      if (endIdx === -1) return false;
      
      for (let i = 0; i < endIdx; i++) {
        const checkSlot = nextDayTimeSlots[i];
        if (!isSlotAvailable(checkSlot, true)) {
          return false;
        }
      }
      
      return true;
    }

    // Для слотов текущего дня
    const endIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    if (endIdx <= startIdx) return false;

    // Если это граничный слот и он идет сразу после startTime - разрешаем
    if (isBoundary(slotTime, false) && endIdx === startIdx + 1) {
      return true;
    }

    // Проверяем все промежуточные слоты
    for (let i = startIdx + 1; i < endIdx; i++) {
      if (isSlotBooked(allDaySlots[i].formattedTime)) return false;
    }
    return true;
  };

  // Проверка, есть ли занятые слоты после startTime в текущем дне
  const hasBookedSlotsAfterStart = (): boolean => {
    if (!startTime) return false;
    
    // Если startTime в следующем дне, то текущий день не влияет на блокировку следующего дня
    const startTimeInNextDay = nextDayTimeSlots.includes(startTime);
    if (startTimeInNextDay) return false;
    
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    if (startIdx === -1) return false;
    
    for (let i = startIdx + 1; i < allDaySlots.length; i++) {
      if (isSlotBooked(allDaySlots[i].formattedTime)) {
        return true;
      }
    }
    return false;
  };

  // Проверка, может ли слот быть выбран как граница диапазона (для универсальности)
  const canBeSelectedAsBoundary = (slotTime: string): boolean => {
    return canBeSelectedAsEnd(slotTime);
  };

  // Проверка, находится ли слот до выбранного начала
  const isBeforeStart = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (!startTime) return false;
    
    // Используем контекст для определения дня startTime
    const startTimeInNextDay = startTimeContext === 'next';
    
    console.log(`isBeforeStart check for ${slotTime} (isNextDay: ${isNextDay}):`, {
      startTime,
      startTimeContext,
      startTimeInNextDay,
      slotTime,
      isNextDay
    });
    
    // Случай 1: startTime в следующем дне
    if (startTimeInNextDay) {
      if (!isNextDay) {
        // Проверяем слот текущего дня - все слоты текущего дня "до начала"
        console.log(`${slotTime} is before start (current day, start in next day)`);
        return true;
      } else {
        // Проверяем слот следующего дня - сравниваем с startTime в том же дне
        const slotIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
        const startIdx = nextDayTimeSlots.findIndex(s => s === startTime);
        const result = slotIdx !== -1 && startIdx !== -1 && slotIdx < startIdx;
        console.log(`${slotTime} comparison in next day: slotIdx=${slotIdx}, startIdx=${startIdx}, result=${result}`);
        return result;
      }
    }
    
    // Случай 2: startTime в текущем дне
    if (!isNextDay) {
      // Проверяем слот текущего дня - сравниваем с startTime в том же дне
      const slotIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
      const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
      const result = slotIdx !== -1 && startIdx !== -1 && slotIdx < startIdx;
      console.log(`${slotTime} comparison in current day: slotIdx=${slotIdx}, startIdx=${startIdx}, result=${result}`);
      return result;
    } else {
      // Проверяем слот следующего дня - никогда не "до начала" если startTime в текущем дне
      console.log(`${slotTime} is not before start (next day, start in current day)`);
      return false;
    }
  };

  // Проверка, находится ли слот после первого занятого после startTime
  const isAfterFirstBooked = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (!startTime) return false;
    
    // Используем контекст для определения дня startTime
    const startTimeInNextDay = startTimeContext === 'next';
    
    console.log(`isAfterFirstBooked check for ${slotTime} (isNextDay: ${isNextDay}):`, {
      startTime,
      startTimeContext,
      startTimeInNextDay,
      slotTime,
      isNextDay
    });
    
    // Если startTime в следующем дне, слоты текущего дня не могут быть "после занятого"
    if (startTimeInNextDay && !isNextDay) {
      return false;
    }
    
    // Если startTime в текущем дне
    if (!startTimeInNextDay) {
      if (!isNextDay) {
        // Ищем первый занятый слот после startTime в текущем дне
        const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
        let firstBookedIdx = -1;
        
        console.log(`Looking for first booked slot after ${startTime} (startIdx: ${startIdx})`);
        
        for (let i = startIdx + 1; i < allDaySlots.length; i++) {
          const checkSlot = allDaySlots[i].formattedTime;
          const isBooked = !availableTimeSlots.includes(checkSlot);
          console.log(`Checking slot ${checkSlot}: isBooked = ${isBooked}`);
          
          if (isBooked) {
            firstBookedIdx = i;
            console.log(`Found first booked slot at index ${i}: ${checkSlot}`);
            break;
          }
        }
        
        if (firstBookedIdx === -1) {
          console.log('No booked slots found after startTime');
          return false;
        }
        
        const slotIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
        const result = slotIdx > firstBookedIdx;
        console.log(`${slotTime} is after first booked: slotIdx=${slotIdx}, firstBookedIdx=${firstBookedIdx}, result=${result}`);
        return result;
      } else {
        // Для слотов следующего дня - если есть занятые слоты в текущем дне после startTime,
        // то все слоты следующего дня "после занятого"
        const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
        
        console.log(`Checking next day slots for isAfterFirstBooked. StartTime: ${startTime} (startIdx: ${startIdx})`);
        
        for (let i = startIdx + 1; i < allDaySlots.length; i++) {
          const checkSlot = allDaySlots[i].formattedTime;
          const isBooked = !availableTimeSlots.includes(checkSlot);
          console.log(`Checking current day slot ${checkSlot} after startTime: isBooked = ${isBooked}`);
          
          if (isBooked) {
            console.log(`Found booked slot ${checkSlot} in current day after startTime - all next day slots are after booked`);
            return true;
          }
        }
        
        console.log('No booked slots found in current day after startTime - next day slots are not after booked');
        return false;
      }
    }
    
    // Если startTime в следующем дне и проверяем слот следующего дня
    if (startTimeInNextDay && isNextDay) {
      const startIdx = nextDayTimeSlots.findIndex(s => s === startTime);
      let firstBookedIdx = -1;
      for (let i = startIdx + 1; i < nextDayTimeSlots.length; i++) {
        if (isSlotBooked(nextDayTimeSlots[i], true)) {
          firstBookedIdx = i;
          break;
        }
      }
      if (firstBookedIdx === -1) return false;
      const slotIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
      return slotIdx > firstBookedIdx;
    }
    
    return false;
  };

  // Проверка, является ли слот прошедшим (для сегодняшней даты)
  const isPastSlot = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (!selectedDate) return false;
    
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    // Если это следующий день, слот не может быть прошедшим
    if (isNextDay) return false;
    
    if (!isToday) return false;
    
    const [slotHour, slotMinute] = slotTime.split(":").map(Number);
    const slotDate = new Date(selectedDate);
    slotDate.setHours(slotHour, slotMinute, 0, 0);
    
    const buffer = 5 * 60 * 1000; // 5 минут в миллисекундах
    return slotDate.getTime() <= (now.getTime() + buffer);
  };

  // Проверка, находится ли слот в выбранном промежутке (с учетом перехода через день)
  const isInSelectedRange = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (!startTime || !endTime) return false;

    // Используем контекст для определения дней
    const startTimeInNextDay = startTimeContext === 'next';
    const endTimeInNextDay = endTimeContext === 'next';
    
    console.log(`isInSelectedRange for ${slotTime} (isNextDay: ${isNextDay}):`, {
      startTime,
      endTime,
      startTimeContext,
      endTimeContext,
      startTimeInNextDay,
      endTimeInNextDay
    });

    // Случай 1: Диапазон внутри текущего дня (startTime и endTime в текущем дне)
    if (!startTimeInNextDay && !endTimeInNextDay) {
      if (isNextDay) return false; // Слоты следующего дня не в диапазоне
      
      const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
      const endIdx = allDaySlots.findIndex(s => s.formattedTime === endTime);
      const currentIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
      
      return startIdx !== -1 && endIdx !== -1 && currentIdx !== -1 && 
             currentIdx > startIdx && currentIdx < endIdx;
    }
    
    // Случай 2: Диапазон внутри следующего дня (startTime и endTime в следующем дне)
    if (startTimeInNextDay && endTimeInNextDay) {
      if (!isNextDay) return false; // Слоты текущего дня не в диапазоне
      
      const startIdx = nextDayTimeSlots.findIndex(s => s === startTime);
      const endIdx = nextDayTimeSlots.findIndex(s => s === endTime);
      const currentIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
      
      return startIdx !== -1 && endIdx !== -1 && currentIdx !== -1 && 
             currentIdx > startIdx && currentIdx < endIdx;
    }
    
    // Случай 3: Диапазон между днями (startTime в текущем дне, endTime в следующем дне)
    if (!startTimeInNextDay && endTimeInNextDay) {
      const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
      
      if (!isNextDay) {
        // Для текущего дня: все слоты после startTime
        const currentIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
        return startIdx !== -1 && currentIdx !== -1 && currentIdx > startIdx;
      } else {
        // Для следующего дня: все слоты до endTime
        const endIdx = nextDayTimeSlots.findIndex(s => s === endTime);
        const currentIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
        return endIdx !== -1 && currentIdx !== -1 && currentIdx < endIdx;
      }
    }
    
    // Случай 4: Невозможный случай (startTime в следующем дне, endTime в текущем дне)
    // Этого не должно происходить, так как нельзя выбрать время назад
    return false;
  };

  // Обработчик клика по слоту
  const handleSlotClick = (time: string, isNextDay: boolean = false) => {
    console.log('=== handleSlotClick start ===');
    console.log('Params:', { time, isNextDay });
    console.log('Current state:', { startTime, endTime });

    if (loadingSlots) {
      console.log('Loading slots, returning');
      return;
    }
    if (isPastSlot(time, isNextDay)) {
      console.log('Past slot, returning');
      return;
    }

    // сброс, если нажали на уже выбранное начало
    if (startTime === time) {
      console.log('Resetting selection');
      resetTimeSelection();
      return;
    }

    // если нет начала или диапазон уже закончен ⇒ начинаем новый выбор
    if (!startTime || endTime) {
      if (isSlotAvailable(time, isNextDay)) {
        console.log('Setting new start time:', time);
        console.log('About to call setStartTime with:', time);
        setStartTime(time);
        setEndTime(null);
        setStartTimeContext(isNextDay ? 'next' : 'current');
        setEndTimeContext(null);
        onRangeSelect(time, null);
        console.log('Called setStartTime and onRangeSelect');
      } else {
        console.log('Slot not available:', time);
      }
      return;
    }

    console.log('Second click logic - trying to set end time');
    console.log('isNextDay:', isNextDay);
    console.log('isSlotAvailable(time, isNextDay):', isSlotAvailable(time, isNextDay));

    // второй клик – пытаемся поставить конец
    if (!isNextDay) {
      console.log('Processing current day end slot');
      // оба слота в текущем дне
      const isAvailable = isSlotAvailable(time, false);
      const isBoundarySlot = isBoundary(time, false);
      const canBeEnd = canBeSelectedAsEnd(time, false);
      
      console.log('Slot availability check:', {
        time,
        isAvailable,
        isBoundarySlot,
        canBeEnd
      });
      
      if (isAvailable || canBeEnd) {
        console.log('Slot is available or can be selected as end, checking indices');
        const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
        const endIdx = allDaySlots.findIndex(s => s.formattedTime === time);
        console.log('startIdx:', startIdx, 'endIdx:', endIdx);
        
        if (endIdx > startIdx) {
          console.log('End index is after start, checking intermediate slots');
          
          // Для граничных слотов не проверяем промежуточные слоты, если это соседний слот
          if (isBoundarySlot && endIdx === startIdx + 1) {
            console.log('Boundary slot right after start - allowing selection');
            console.log('Setting endTime to:', time);
            setEndTime(time);
            setEndTimeContext('current');
            onRangeSelect(startTime, time);
            console.log('After setting endTime, calling onRangeSelect with:', startTime, time);
            return;
          }
          
          // Проверяем промежуточные слоты только для обычных доступных слотов
          if (isAvailable) {
            let allIntermediateSlotsAvailable = true;
            for (let i = startIdx + 1; i < endIdx; i++) {
              const intermediateSlot = allDaySlots[i].formattedTime;
              const isIntermediateAvailable = availableTimeSlots.includes(intermediateSlot);
              console.log(`Intermediate slot ${intermediateSlot}: available = ${isIntermediateAvailable}`);
              if (!isIntermediateAvailable) {
                allIntermediateSlotsAvailable = false;
                break;
              }
            }
            
            console.log('All intermediate slots available:', allIntermediateSlotsAvailable);
            
            if (allIntermediateSlotsAvailable) {
              console.log('Setting end time for current day:', time);
              setEndTime(time);
              setEndTimeContext('current');
              onRangeSelect(startTime, time);
            } else {
              console.log('Some intermediate slots are not available');
            }
          } else if (canBeEnd) {
            console.log('Slot can be selected as end via canBeSelectedAsEnd logic');
            setEndTime(time);
            setEndTimeContext('current');
            onRangeSelect(startTime, time);
          }
        } else {
          console.log('End index is not after start index');
        }
      } else {
        console.log('End slot is not available and cannot be selected as end');
      }
      return;
    }

    // если конец в следующем дне
    if (isNextDay) {
      console.log('Processing next day end slot');
      const isAvailable = isSlotAvailable(time, true);
      const isBoundarySlot = isBoundary(time, true);
      const canBeEnd = canBeSelectedAsEnd(time, true);
      
      console.log('Next day slot check:', {
        time,
        isAvailable,
        isBoundarySlot,
        canBeEnd
      });
      
      if (isAvailable || canBeEnd) {
        console.log('Setting end time for next day:', time);
        setEndTime(time);
        setEndTimeContext('next');
        onRangeSelect(startTime, time);
      } else {
        console.log('Next day slot not available and cannot be selected as end');
      }
      return;
    }
    console.log('=== handleSlotClick end ===');
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
            <>
              <div className={styles.timeSlots}>
                {allDaySlots.map(slot => {
                  // Используем контекст для определения принадлежности слотов
                  const isStart = startTime === slot.formattedTime && startTimeContext === 'current';
                  const isEnd = endTime === slot.formattedTime && endTimeContext === 'current';
                  
                  const isInRange = isInSelectedRange(slot.formattedTime, false);
                  const hasBoundary = isBoundary(slot.formattedTime, false);
                  const isSelected = isStart || isEnd || isInRange;
                  const isEdge = isStart || isEnd;
                  const past = isPastSlot(slot.formattedTime);
                  const isAvailable = isSlotAvailable(slot.formattedTime);
                  const isBooked = isSlotBooked(slot.formattedTime);
                  const isSelectableAsBoundary = canBeSelectedAsBoundary(slot.formattedTime);
                  const isBefore = isBeforeStart(slot.formattedTime, false);
                  const isAfterBooked = isAfterFirstBooked(slot.formattedTime, false);

                  // Логирование для отладки
                  if (slot.formattedTime === '00:00' || slot.formattedTime === '01:00' || slot.formattedTime === '17:00') {
                    console.log(`Current day ${slot.formattedTime} slot logic:`, {
                      slotTime: slot.formattedTime,
                      startTime,
                      endTime,
                      startTimeContext,
                      endTimeContext,
                      isStart,
                      isEnd,
                      isInRange,
                      isSelected,
                      hasBoundary
                    });
                  }

                  return (
                    <button
                      key={`current-${slot.formattedTime}`}
                      className={`
                        ${styles.timeSlot}
                        ${isSelected ? styles.timeSlotActive : ''}
                        ${isEdge ? styles.timeSlotSelectedEdge : ''}
                        ${hasBoundary ? styles.timeSlotBoundary : ''}
                        ${(isBooked && !hasBoundary && !isSelected && !isSelectableAsBoundary) ? styles.timeSlotUnavailableRed : ''}
                        ${isBefore ? styles.timeSlotBeforeStart : ''}
                        ${isAfterBooked ? styles.timeSlotAfterBooked : ''}
                      `}
                      onClick={() => {
                        console.log('=== CLICKING CURRENT DAY SLOT ===');
                        console.log('Slot:', slot.formattedTime);
                        console.log('Current state before click:', { startTime, endTime });
                        console.log('startTimeInNextDay:', startTime ? nextDayTimeSlots.includes(startTime) : false);
                        console.log('isBefore:', isBefore);
                        // Разрешаем клик только если слот не прошедший, не до начала, не после занятого и не заблокирован
                        const allowClick = !past && !isBefore && !isAfterBooked;
                        console.log('allowClick:', allowClick);
                        allowClick && handleSlotClick(slot.formattedTime);
                      }}
                      disabled={past || isBefore || isAfterBooked || (isBooked && !isSelectableAsBoundary)}
                    >
                      {slot.formattedTime}
                    </button>
                  );
                })}
              </div>

              {nextDayTimeSlots.length > 0 && (
                <>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      {formatDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                    </h3>
                  </div>
                  <div className={styles.timeSlots}>
                    {nextDayTimeSlots.map(slot => {
                      // Используем контекст для определения принадлежности слотов
                      const isStart = startTime === slot && startTimeContext === 'next';
                      const isEnd = endTime === slot && endTimeContext === 'next';
                      
                      const isInRange = isInSelectedRange(slot, true);
                      const isAvailable = isSlotAvailable(slot, true);
                      const isBooked = isSlotBooked(slot, true);
                      const hasBoundary = isBoundary(slot, true);
                      const hasBookedAfterStart = hasBookedSlotsAfterStart();
                      const isBefore = isBeforeStart(slot, true);
                      const isAfterBooked = isAfterFirstBooked(slot, true);
                      const canBeSelected = startTime && !endTime && (canBeSelectedAsEnd(slot, true) || hasBoundary) && !hasBookedAfterStart && !isBefore && !isAfterBooked;
                      const isSelected = isStart || isEnd || isInRange;
                      
                      // Логирование для отладки
                      if (slot === '00:00' || slot === '01:00') {
                        console.log(`Next day ${slot} detailed logic:`, {
                          slotTime: slot,
                          startTime,
                          endTime,
                          startTimeContext,
                          endTimeContext,
                          isStart,
                          isEnd,
                          isInRange,
                          isSelected,
                          isAvailable,
                          isBooked,
                          hasBoundary,
                          canBeSelected
                        });
                      }
                      
                      return (
                        <button
                          key={`next-${slot}`}
                          className={`
                            ${styles.timeSlot}
                            ${!isAvailable && !hasBoundary ? styles.timeSlotUnavailableRed : ''}
                            ${hasBoundary ? styles.timeSlotBoundary : ''}
                            ${canBeSelected ? styles.timeSlotSelectable : ''}
                            ${isSelected ? styles.timeSlotActive : ''}
                            ${(isStart || isEnd) ? styles.timeSlotSelectedEdge : ''}
                            ${hasBookedAfterStart ? styles.timeSlotUnavailableRed : ''}
                            ${isBefore ? styles.timeSlotBeforeStart : ''}
                            ${isAfterBooked ? styles.timeSlotAfterBooked : ''}
                          `}
                          onClick={() => {
                            console.log('=== CLICKING NEXT DAY SLOT ===');
                            console.log('Slot:', slot);
                            console.log('Current state before click:', { startTime, endTime });
                            console.log('hasBookedAfterStart:', hasBookedAfterStart);
                            console.log('isBefore:', isBefore);
                            console.log('isAfterBooked:', isAfterBooked);
                            console.log('isAvailable:', isAvailable);
                            console.log('hasBoundary:', hasBoundary);
                            console.log('canBeSelected:', canBeSelected);
                            !hasBookedAfterStart && !isBefore && !isAfterBooked && handleSlotClick(slot, true);
                          }}
                          disabled={hasBookedAfterStart || isBefore || isAfterBooked || (!isAvailable && !hasBoundary && !canBeSelected)}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
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