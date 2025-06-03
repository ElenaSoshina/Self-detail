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
  onRangeSelect: (start: string | null, end: string | null, startContext?: 'current' | 'next', endContext?: 'current' | 'next') => void;
  startTime: string | null;
  endTime: string | null;
  startTimeContext?: 'current' | 'next' | null;
  endTimeContext?: 'current' | 'next' | null;
  preSelectedSlots?: string[];
  editMode?: boolean;
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
  endTime: externalEndTime,
  startTimeContext,
  endTimeContext,
  preSelectedSlots,
  editMode
}) => {
  const [startTime, setStartTime] = useState<string | null>(externalStartTime);
  const [endTime, setEndTime] = useState<string | null>(externalEndTime);
  
  // Добавляем состояние для отслеживания контекста выбора
  const [startTimeContextState, setStartTimeContextState] = useState<'current' | 'next' | null>(startTimeContext || null);
  const [endTimeContextState, setEndTimeContextState] = useState<'current' | 'next' | null>(endTimeContext || null);

  // Состояние для предупреждения
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [warningTimeout, setWarningTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setStartTime(externalStartTime);
    setEndTime(externalEndTime);
    setStartTimeContextState(startTimeContext || null);
    setEndTimeContextState(endTimeContext || null);
  }, [externalStartTime, externalEndTime, startTimeContext, endTimeContext]);

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (warningTimeout) {
        clearTimeout(warningTimeout);
      }
    };
  }, [warningTimeout]);

  // Функция для показа предупреждения
  const showWarning = (message: string) => {
    // Очищаем предыдущий таймер если есть
    if (warningTimeout) {
      clearTimeout(warningTimeout);
    }
    
    setWarningMessage(message);
    
    // Автоматически скрываем предупреждение через 3 секунды
    const timeout = setTimeout(() => {
      setWarningMessage(null);
      setWarningTimeout(null);
    }, 3000);
    
    setWarningTimeout(timeout);
  };

  // Функция для сброса выбранного времени
  const resetTimeSelection = () => {
    setStartTime(null);
    setEndTime(null);
    setStartTimeContextState(null);
    setEndTimeContextState(null);
    onRangeSelect(null, null, undefined, undefined);
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
    // Предвыбранные слоты всегда считаются доступными
    if (isPreSelectedSlot(slotTime)) {
      return true;
    }
    
    if (isNextDay) {
      // Для следующего дня проверяем доступность через nextDayTimeSlotData
      const slotData = nextDayTimeSlotData.find(data => data.formattedTime === slotTime);
      return slotData ? slotData.available : false;
    }
    return availableTimeSlots.includes(slotTime);
  };

  // Проверка, является ли слот занятым (явно помечен как unavailable в API)
  const isSlotBooked = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (isNextDay) {
      // Для следующего дня проверяем в nextDayTimeSlotData
      const slotData = nextDayTimeSlotData.find(data => data.formattedTime === slotTime);
      // Слот занят только если он существует в данных И помечен как недоступный
      return slotData ? !slotData.available : false;
    }
    
    // Для текущего дня проверяем в timeSlotData
    const slotData = timeSlotData.find(data => data.formattedTime === slotTime);
    // Слот занят только если он существует в данных И помечен как недоступный
    // Если слота нет в данных - он не занят, а просто недоступен (разрыв в расписании)
    return slotData ? !slotData.available : false;
  };

  // Проверка, является ли слот недоступным (нет в расписании - разрыв в работе)
  const isSlotUnavailable = (slotTime: string, isNextDay: boolean = false): boolean => {
    return !isSlotAvailable(slotTime, isNextDay);
  };

  // Проверка, является ли слот границей (конец доступного диапазона)
  const isBoundary = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (isNextDay) {
      // Для следующего дня проверяем границы в nextDayTimeSlots
      const idx = nextDayTimeSlots.findIndex(s => s === slotTime);
      if (idx === -1) return false;
      if (!isSlotUnavailable(slotTime, true)) return false;
      // Если предыдущий слот свободен
      if (idx > 0 && isSlotAvailable(nextDayTimeSlots[idx - 1], true)) return true;
      return false;
    }
    
    const idx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    if (idx === -1) return false;
    
    // Специальная обработка для слота 24:00 - он всегда может быть границей если предыдущий слот доступен
    if (slotTime === '24:00') {
      const prevSlot = allDaySlots[idx - 1]?.formattedTime;
      return prevSlot ? isSlotAvailable(prevSlot) : false;
    }
    
    // Слот является граничным если он недоступен, но предыдущий слот доступен
    if (!isSlotUnavailable(slotTime)) return false;
    
    // Если предыдущий слот свободен - это граница
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
    
    // Специальная проверка: может ли слот быть концом диапазона согласно API
    if (!isNextDay) {
      const correspondingSlot = timeSlotData.find(data => {
        const endTime = new Date(data.end);
        const slotHour = parseInt(slotTime.split(':')[0]);
        return endTime.getHours() === slotHour && data.available;
      });
      
      // Если найден доступный диапазон, который заканчивается в этом слоте
      if (correspondingSlot) {
        const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
        const endIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
        
        // Проверяем что endTime идет после startTime
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          return true;
        }
      }
    }
    
    // Специальная обработка для слота 24:00 - он может быть выбран как конец если предыдущий слот доступен
    if (slotTime === '24:00' && !isNextDay) {
      const prevSlotTime = '23:00';
      return isSlotAvailable(prevSlotTime) && startTime !== '24:00';
    }
    
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
        const checkSlot = allDaySlots[i].formattedTime;
        // Пропускаем слот 24:00 если он есть (мы его не отображаем)
        if (checkSlot === '24:00') continue;
        
        // В режиме редактирования пропускаем предвыбранные слоты при проверке доступности
        if (editMode && isPreSelectedSlot(checkSlot)) continue;
        
        if (isSlotUnavailable(checkSlot)) {
          // Если есть недоступный слот после startTime в текущем дне - 
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

    // Проверяем все промежуточные слоты - если есть недоступные, блокируем выбор
    for (let i = startIdx + 1; i < endIdx; i++) {
      const intermediateSlot = allDaySlots[i].formattedTime;
      
      // В режиме редактирования пропускаем предвыбранные слоты при проверке доступности
      if (editMode && isPreSelectedSlot(intermediateSlot)) continue;
      
      // Если промежуточный слот недоступен (нет в данных или помечен как недоступный)
      if (isSlotUnavailable(intermediateSlot)) {
        return false;
      }
    }
    return true;
  };

  // Проверка, есть ли недоступные слоты после startTime в текущем дне
  const hasBookedSlotsAfterStart = (): boolean => {
    if (!startTime) return false;
    
    // Если startTime в следующем дне, то текущий день не влияет на блокировку следующего дня
    const startTimeInNextDay = nextDayTimeSlots.includes(startTime);
    if (startTimeInNextDay) return false;
    
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    if (startIdx === -1) return false;
    
    for (let i = startIdx + 1; i < allDaySlots.length; i++) {
      if (isSlotUnavailable(allDaySlots[i].formattedTime)) {
        return true;
      }
    }
    return false;
  };

  // Проверка, может ли слот быть выбран как граница диапазона (для универсальности)
  const canBeSelectedAsBoundary = (slotTime: string): boolean => {
    return canBeSelectedAsEnd(slotTime);
  };

  // Проверка, находится ли слот до выбранного начала (чтобы предотвратить выбор времени назад)
  const isBeforeStart = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (!startTime) return false;
    
    // Используем контекст для определения дня startTime
    const startTimeInNextDay = startTimeContextState === 'next';
    
    // Случай 1: startTime в следующем дне
    if (startTimeInNextDay) {
      if (!isNextDay) {
        // Все слоты текущего дня считаются "до начала" когда startTime в следующем дне
        return true;
      } else {
        // Проверяем слот следующего дня - сравниваем с startTime в том же дне
        const slotIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
        const startIdx = nextDayTimeSlots.findIndex(s => s === startTime);
        return slotIdx !== -1 && startIdx !== -1 && slotIdx < startIdx;
      }
    }
    
    // Случай 2: startTime в текущем дне
    if (!isNextDay) {
      // Проверяем слот текущего дня - сравниваем с startTime в том же дне
      const slotIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
      const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
      return slotIdx !== -1 && startIdx !== -1 && slotIdx < startIdx;
    } else {
      // Проверяем слот следующего дня - НЕ "до начала" если startTime в текущем дне
      return false;
    }
  };

  // Проверка, находится ли слот после первого занятого после startTime
  const isAfterFirstBooked = (slotTime: string, isNextDay: boolean = false): boolean => {
    if (!startTime) return false;
    
    // Используем контекст для определения дня startTime
    const startTimeInNextDay = startTimeContextState === 'next';
    
    // Если startTime в следующем дне, слоты текущего дня не могут быть "после занятого"
    if (startTimeInNextDay && !isNextDay) {
      return false;
    }
    
    // Если startTime в текущем дне
    if (!startTimeInNextDay) {
      if (!isNextDay) {
        // Ищем первый НЕДОСТУПНЫЙ слот после startTime в текущем дне (включая разрывы в расписании)
        const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
        let firstUnavailableIdx = -1;
        
        for (let i = startIdx + 1; i < allDaySlots.length; i++) {
          const checkSlot = allDaySlots[i].formattedTime;
          // Пропускаем слот 24:00 если он есть (мы его не отображаем)
          if (checkSlot === '24:00') continue;
          
          // В режиме редактирования пропускаем предвыбранные слоты при проверке недоступности
          if (editMode && isPreSelectedSlot(checkSlot)) continue;
          
          if (isSlotUnavailable(checkSlot)) {
            firstUnavailableIdx = i;
            break;
          }
        }
        
        if (firstUnavailableIdx === -1) {
          return false;
        }
        
        const slotIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
        const result = slotIdx > firstUnavailableIdx;
        return result;
      } else {
        // Для слотов следующего дня - если есть НЕДОСТУПНЫЕ слоты в текущем дне после startTime,
        // то все слоты следующего дня "после недоступного"
        const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
        
        // Особый случай: если startTime - это последний слот текущего дня (например 23:00),
        // то слоты следующего дня НЕ должны блокироваться
        const isLastSlotOfDay = startIdx === allDaySlots.length - 1 || 
                               (startIdx === allDaySlots.length - 2 && allDaySlots[allDaySlots.length - 1].formattedTime === '24:00');
        
        if (isLastSlotOfDay) {
          return false; // Не блокируем слоты следующего дня
        }
        
        for (let i = startIdx + 1; i < allDaySlots.length; i++) {
          const checkSlot = allDaySlots[i].formattedTime;
          // Пропускаем слот 24:00 если он есть (мы его не отображаем)
          if (checkSlot === '24:00') continue;
          
          // В режиме редактирования пропускаем предвыбранные слоты при проверке недоступности
          if (editMode && isPreSelectedSlot(checkSlot)) continue;
          
          // Слот недоступен если он не в availableTimeSlots (разрыв в расписании) 
          // или помечен как занятый в API
          if (isSlotUnavailable(checkSlot)) {
            return true;
          }
        }
        
        return false;
      }
    }
    
    // Если startTime в следующем дне и проверяем слот следующего дня
    if (startTimeInNextDay && isNextDay) {
      const startIdx = nextDayTimeSlots.findIndex(s => s === startTime);
      let firstBookedIdx = -1;
      for (let i = startIdx + 1; i < nextDayTimeSlots.length; i++) {
        const checkSlot = nextDayTimeSlots[i];
        const slotData = nextDayTimeSlotData.find(data => data.formattedTime === checkSlot);
        const isReallyBooked = slotData && !slotData.available;
        if (isReallyBooked) {
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
    const startTimeInNextDay = startTimeContextState === 'next';
    const endTimeInNextDay = endTimeContextState === 'next';
    
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
      if (!isNextDay) return false; // Слоты текущего дня НЕ в диапазоне
      
      const startIdx = nextDayTimeSlots.findIndex(s => s === startTime);
      const endIdx = nextDayTimeSlots.findIndex(s => s === endTime);
      const currentIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
      
      // Включаем краевые слоты: >= startIdx && <= endIdx
      const result = startIdx !== -1 && endIdx !== -1 && currentIdx !== -1 && 
             currentIdx >= startIdx && currentIdx <= endIdx;
      
      return result;
    }
    
    // Случай 3: Диапазон между днями (startTime в текущем дне, endTime в следующем дне)
    if (!startTimeInNextDay && endTimeInNextDay) {
      const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
      
      if (!isNextDay) {
        // Для текущего дня: все слоты после startTime ВКЛЮЧАЯ startTime
        const currentIdx = allDaySlots.findIndex(s => s.formattedTime === slotTime);
        return startIdx !== -1 && currentIdx !== -1 && currentIdx >= startIdx;
      } else {
        // Для следующего дня: все слоты до endTime ВКЛЮЧАЯ endTime
        const endIdx = nextDayTimeSlots.findIndex(s => s === endTime);
        const currentIdx = nextDayTimeSlots.findIndex(s => s === slotTime);
        return endIdx !== -1 && currentIdx !== -1 && currentIdx <= endIdx;
      }
    }
    
    // Случай 4: Невозможный случай (startTime в следующем дне, endTime в текущем дне)
    // Этого не должно происходить, так как нельзя выбрать время назад
    return false;
  };

  // Проверка, является ли слот предвыбранным (текущее редактируемое бронирование)
  const isPreSelectedSlot = (slotTime: string): boolean => {
    return editMode && preSelectedSlots ? preSelectedSlots.includes(slotTime) : false;
  };

  // Обработчик клика по слоту
  const handleSlotClick = (time: string, isNextDay: boolean = false) => {
    console.log('🕐 TimeSlots - Клик по слоту:', {
      time: time,
      isNextDay: isNextDay,
      selectedDate: selectedDate,
      formattedSelectedDate: selectedDate ? formatDate(selectedDate) : 'null',
      currentStartTime: startTime,
      currentEndTime: endTime,
      currentStartTimeContext: startTimeContextState,
      currentEndTimeContext: endTimeContextState
    });
    
    if (loadingSlots) return;
    if (isPastSlot(time, isNextDay)) return;

    // сброс, если нажали на уже выбранное начало
    if (startTime === time) {
      console.log('🔄 TimeSlots - Сброс выбора (нажали на уже выбранное начало)');
      resetTimeSelection();
      return;
    }

    // если нет начала или диапазон уже закончен ⇒ начинаем новый выбор
    if (!startTime || endTime) {
      if (isSlotAvailable(time, isNextDay)) {
        console.log('🎯 TimeSlots - Новый выбор начала:', {
          selectedTime: time,
          isNextDay: isNextDay,
          context: isNextDay ? 'next' : 'current'
        });
        setStartTime(time);
        setEndTime(null);
        const newStartContext = isNextDay ? 'next' : 'current';
        setStartTimeContextState(newStartContext);
        setEndTimeContextState(null);
        onRangeSelect(time, null, newStartContext, undefined);
      } else {
        console.log('❌ TimeSlots - Слот недоступен для выбора как начало:', time);
        // Проверяем, является ли это граничным слотом
        const isBoundarySlot = isBoundary(time, isNextDay);
        if (isBoundarySlot) {
          showWarning('Этот слот может быть выбран только как время окончания. Сначала выберите время начала.');
        }
      }
      return;
    }

    // второй клик – пытаемся поставить конец
    console.log('🎯 TimeSlots - Попытка установить конец диапазона:', {
      selectedTime: time,
      isNextDay: isNextDay,
      startTime: startTime,
      startTimeContext: startTimeContextState
    });
    
    if (!isNextDay) {
      // оба слота в текущем дне
      const isAvailable = isSlotAvailable(time, false);
      const isBoundarySlot = isBoundary(time, false);
      const canBeEnd = canBeSelectedAsEnd(time, false);
      
      console.log('🔍 TimeSlots - Проверка слота текущего дня:', {
        time: time,
        isAvailable: isAvailable,
        isBoundarySlot: isBoundarySlot,
        canBeEnd: canBeEnd
      });
      
      // Проверяем клик на граничный слот без начала выбора
      if (isBoundarySlot && !startTime) {
        showWarning('Этот слот может быть выбран только как время окончания. Сначала выберите время начала.');
        return;
      }
      
      if (isAvailable || canBeEnd) {
        const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
        const endIdx = allDaySlots.findIndex(s => s.formattedTime === time);
        
        console.log('📍 TimeSlots - Индексы слотов:', {
          startTime: startTime,
          endTime: time,
          startIdx: startIdx,
          endIdx: endIdx
        });
        
        if (endIdx > startIdx) {
          // Для граничных слотов не проверяем промежуточные слоты, если это соседний слот
          if (isBoundarySlot && endIdx === startIdx + 1) {
            console.log('✅ TimeSlots - Установка граничного слота как конец диапазона');
            setEndTime(time);
            setEndTimeContextState('current');
            onRangeSelect(startTime, time, startTimeContextState || 'current', 'current');
            return;
          }
          
          // Проверяем промежуточные слоты только для обычных доступных слотов
          if (isAvailable) {
            let allIntermediateSlotsAvailable = true;
            for (let i = startIdx + 1; i < endIdx; i++) {
              const intermediateSlot = allDaySlots[i].formattedTime;
              
              // В режиме редактирования пропускаем предвыбранные слоты при проверке доступности
              if (editMode && isPreSelectedSlot(intermediateSlot)) continue;
              
              const isIntermediateAvailable = availableTimeSlots.includes(intermediateSlot);
              if (!isIntermediateAvailable) {
                allIntermediateSlotsAvailable = false;
                break;
              }
            }
            
            console.log('🔍 TimeSlots - Проверка промежуточных слотов:', {
              allIntermediateSlotsAvailable: allIntermediateSlotsAvailable
            });
            
            if (allIntermediateSlotsAvailable) {
              console.log('✅ TimeSlots - Установка конца диапазона (все промежуточные слоты доступны)');
              setEndTime(time);
              setEndTimeContextState('current');
              onRangeSelect(startTime, time, startTimeContextState || 'current', 'current');
            }
          } else if (canBeEnd) {
            console.log('✅ TimeSlots - Установка конца диапазона (canBeEnd)');
            setEndTime(time);
            setEndTimeContextState('current');
            onRangeSelect(startTime, time, startTimeContextState || 'current', 'current');
          }
        } else {
          console.log('❌ TimeSlots - Недопустимый порядок слотов (endIdx <= startIdx)');
        }
      } else {
        console.log('❌ TimeSlots - Слот недоступен как конец диапазона');
      }
      return;
    }

    // если конец в следующем дне
    if (isNextDay) {
      console.log('🌅 TimeSlots - Обработка слота следующего дня как конец');
      const isAvailable = isSlotAvailable(time, true);
      const isBoundarySlot = isBoundary(time, true);
      const canBeEnd = canBeSelectedAsEnd(time, true);
      
      console.log('🔍 TimeSlots - Проверка слота следующего дня:', {
        time: time,
        isAvailable: isAvailable,
        isBoundarySlot: isBoundarySlot,
        canBeEnd: canBeEnd
      });
      
      // Проверяем клик на граничный слот без начала выбора
      if (isBoundarySlot && !startTime) {
        showWarning('Этот слот может быть выбран только как время окончания. Сначала выберите время начала.');
        return;
      }
      
      if (isAvailable || canBeEnd) {
        console.log('✅ TimeSlots - Установка слота следующего дня как конец диапазона');
        setEndTime(time);
        setEndTimeContextState('next');
        onRangeSelect(startTime, time, startTimeContextState || 'current', 'next');
      } else {
        console.log('❌ TimeSlots - Слот следующего дня недоступен как конец диапазона');
      }
      return;
    }
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

          {/* Предупреждение для пользователя */}
          {warningMessage && (
            <div className={styles.warningMessage}>
              <span className={styles.warningIcon}>⚠️</span>
              <span className={styles.warningText}>{warningMessage}</span>
            </div>
          )}

          {loadingSlots ? (
            <div className={styles.loadingMessage}>Загрузка доступных слотов...</div>
          ) : slotsError ? (
            <div className={styles.errorMessage}>{slotsError}</div>
          ) : availableTimeSlots.length > 0 || startTime || endTime || (editMode && preSelectedSlots?.length) ? (
            <>
              <div className={styles.timeSlots}>
                {allDaySlots.map(slot => {
                  // Не отображаем слот 24:00
                  if (slot.formattedTime === '24:00') {
                    return null;
                  }
                  
                  // Используем контекст для определения принадлежности слотов
                  const isStart = startTime === slot.formattedTime && startTimeContextState === 'current';
                  const isEnd = endTime === slot.formattedTime && endTimeContextState === 'current';
                  
                  const isInRange = isInSelectedRange(slot.formattedTime, false);
                  const hasBoundary = isBoundary(slot.formattedTime, false);
                  const isSelected = isStart || isEnd || isInRange;
                  const isEdge = isStart || isEnd;
                  const past = isPastSlot(slot.formattedTime);
                  const isAvailable = isSlotAvailable(slot.formattedTime);
                  const isBooked = isSlotBooked(slot.formattedTime, false);
                  const isUnavailable = isSlotUnavailable(slot.formattedTime, false);
                  const isSelectableAsBoundary = canBeSelectedAsBoundary(slot.formattedTime);
                  const isBefore = isBeforeStart(slot.formattedTime, false);
                  const isAfterBooked = isAfterFirstBooked(slot.formattedTime, false);
                  const isPreSelected = isPreSelectedSlot(slot.formattedTime);

                  return (
                    <button
                      key={`current-${slot.formattedTime}`}
                      className={`
                        ${styles.timeSlot}
                        ${isSelected ? styles.timeSlotActive : ''}
                        ${isEdge ? styles.timeSlotSelectedEdge : ''}
                        ${hasBoundary ? styles.timeSlotBoundary : ''}
                        ${isUnavailable && !hasBoundary && !isPreSelected ? styles.timeSlotUnavailableRed : ''}
                        ${isBefore ? styles.timeSlotBeforeStart : ''}
                        ${isAfterBooked ? styles.timeSlotAfterBooked : ''}
                      `}
                      onClick={() => {
                        // Разрешаем клик если слот не прошедший, не до начала, не после занятого и (доступен ИЛИ может быть границей ИЛИ предвыбран)
                        const allowClick = !past && !isBefore && !isAfterBooked && (isAvailable || isSelectableAsBoundary || hasBoundary || isPreSelected);
                        allowClick && handleSlotClick(slot.formattedTime);
                      }}
                      disabled={past || isBefore || isAfterBooked || (!isAvailable && !isSelectableAsBoundary && !hasBoundary && !isPreSelected)}
                    >
                      {slot.formattedTime}
                    </button>
                  );
                }).filter(Boolean)}
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
                      const isStart = startTime === slot && startTimeContextState === 'next';
                      const isEnd = endTime === slot && endTimeContextState === 'next';
                      
                      const isInRange = isInSelectedRange(slot, true);
                      const isAvailable = isSlotAvailable(slot, true);
                      const isBooked = isSlotBooked(slot, true);
                      const isUnavailable = isSlotUnavailable(slot, true);
                      const hasBoundary = isBoundary(slot, true);
                      const isBefore = isBeforeStart(slot, true);
                      const isAfterBooked = isAfterFirstBooked(slot, true);
                      const canBeSelected = startTime && !endTime && (canBeSelectedAsEnd(slot, true) || hasBoundary) && !isBefore && !isAfterBooked;
                      const isSelected = isStart || isEnd || isInRange;
                      
                      return (
                        <button
                          key={`next-${slot}`}
                          className={`
                            ${styles.timeSlot}
                            ${isUnavailable && !hasBoundary && !isAvailable ? styles.timeSlotUnavailableRed : ''}
                            ${hasBoundary ? styles.timeSlotBoundary : ''}
                            ${canBeSelected ? styles.timeSlotSelectable : ''}
                            ${isSelected ? styles.timeSlotActive : ''}
                            ${(isStart || isEnd) ? styles.timeSlotSelectedEdge : ''}
                            ${isBefore ? styles.timeSlotBeforeStart : ''}
                            ${isAfterBooked ? styles.timeSlotAfterBooked : ''}
                          `}
                          onClick={() => {
                            // Разрешаем клик если слот доступен или может быть выбран как конец
                            const allowClick = !isBefore && !isAfterBooked && (isAvailable || canBeSelected || hasBoundary);
                            allowClick && handleSlotClick(slot, true);
                          }}
                          disabled={isBefore || isAfterBooked || (!isAvailable && !hasBoundary && !canBeSelected)}
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
            <div className={styles.noTimeSlotsMessage}>
              {selectedDate && selectedDate.toDateString() === new Date().toDateString() && new Date().getHours() >= 22
                ? 'Слишком поздно для бронирования на сегодня. Выберите другую дату'
                : 'Нет доступных слотов на выбранную дату. Выберите другую дату'
              }
            </div>
          )}
        </>
      ) : (
        <div className={styles.loadingMessage}>Загрузка свободных слотов...</div>
      )}
    </div>
  );
};

export default TimeSlots; 