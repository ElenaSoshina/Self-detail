import React, { useState, useEffect, useRef } from 'react';
import styles from './AdminCalendar.module.css';
import { mockSlots, BookingSlot } from './mockData';
import axios from 'axios';
import TimeSlots from '../CalendarPage/TimeSlots';
import CalendarPage from '../CalendarPage/CalendarPage';

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface TimeSlotData {
  formattedTime: string;
  originalData: any;
  sortKey: number;
  start: Date;
  end: Date;
  available: boolean;
}

const AdminCalendar: React.FC<{ onUserSelect: (userId: string) => void }> = ({ onUserSelect }) => {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showAvailableSlots, setShowAvailableSlots] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotData[]>([]);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showCalendarPage, setShowCalendarPage] = useState(false);

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      const start = `${year}-${month}-${day}T00:00:00`;
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextYear = nextDay.getFullYear();
      const nextMonth = (nextDay.getMonth() + 1).toString().padStart(2, '0');
      const nextDayNum = nextDay.getDate().toString().padStart(2, '0');
      const end = `${nextYear}-${nextMonth}-${nextDayNum}T00:00:00`;

      const response = await axios.get('https://backend.self-detailing.duckdns.org/api/v1/calendar/available', {
        params: { start, end },
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });

      if (!response.data || !response.data.data) {
        throw new Error('Неверный формат данных');
      }

      const timeSlotsWithData = response.data.data.map((slot: any) => {
        const slotTime = new Date(slot.start);
        const hours = slotTime.getHours();
        const minutes = slotTime.getMinutes();
        return {
          formattedTime: `${hours < 10 ? '0' + hours : hours}:${minutes === 0 ? '00' : minutes < 10 ? '0' + minutes : minutes}`,
          originalData: slot,
          sortKey: hours * 60 + minutes,
          start: slotTime,
          end: new Date(slot.end),
          available: slot.available
        };
      });

      timeSlotsWithData.sort((a: TimeSlotData, b: TimeSlotData) => a.sortKey - b.sortKey);
      const formattedTimeSlots = timeSlotsWithData.map((slot: TimeSlotData) => slot.formattedTime);
      
      setAvailableTimeSlots(formattedTimeSlots);
      setTimeSlotData(timeSlotsWithData);
      setSlotsError(null);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setSlotsError('Ошибка загрузки слотов.');
      setAvailableTimeSlots([]);
      setTimeSlotData([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      const filtered = mockSlots
        .filter(slot => {
          const slotDate = new Date(slot.start);
          return slotDate.toDateString() === currentDate.toDateString() && slot.isBooked;
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setSlots(filtered);
      setLoading(false);
    };
    fetchSlots();
  }, [currentDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const handleSlotClick = (slot: BookingSlot) => {
    setSelectedSlot(slot);
    if (slot.isBooked && slot.bookingDetails?.userId) {
      onUserSelect(slot.bookingDetails.userId);
    }
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
    setSelectedSlot(null);
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
    setSelectedSlot(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'short'
    });
  };

  const generateDaysForMonth = (year: number, month: number) => {
    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay() || 7;
    const daysFromPrevMonth = firstDayWeekday - 1;

    // Добавляем дни предыдущего месяца
    const prevMonth = new Date(year, month, 0);
    for (let i = prevMonth.getDate() - daysFromPrevMonth + 1; i <= prevMonth.getDate(); i++) {
      const date = new Date(year, month - 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date())
      });
    }

    // Добавляем дни текущего месяца
    const today = new Date();
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today)
      });
    }

    // Добавляем дни следующего месяца
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date())
      });
    }

    return days;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  const handlePrevMonth = () => {
    setCalendarDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCalendarDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setShowDatePicker(false);
    setSelectedSlot(null);
  };

  const handleAdminBooking = () => {
    setShowCalendarPage(true);
  };

  const handleTimeSlotClick = (time: string) => {
    const slot = timeSlotData.find(s => s.formattedTime === time);
    if (!slot || !slot.available) return;

    if (!startTime || (startTime && endTime)) {
      setStartTime(time);
      setEndTime(null);
    } else if (startTime && !endTime) {
      if (time === startTime) {
        setStartTime(null);
        setEndTime(null);
      } else {
        setEndTime(time);
      }
    }
  };

  // Генерация всех слотов за сутки (00:00-01:00 ... 23:00-00:00)
  const allDaySlots = Array.from({ length: 24 }, (_, h) => {
    const start = `${h < 10 ? '0' + h : h}:00`;
    const end = `${(h + 1) < 10 ? '0' + (h + 1) : (h + 1 === 24 ? '00' : h + 1)}:00`;
    return { formattedTime: start, start, end };
  });

  // Проверка, занят ли слот
  const isSlotBooked = (slotTime: string) => {
    return slots.some(slot => {
      const date = new Date(slot.start);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const formatted = `${hours < 10 ? '0' + hours : hours}:${minutes === 0 ? '00' : minutes < 10 ? '0' + minutes : minutes}`;
      return formatted === slotTime;
    });
  };

  const days = generateDaysForMonth(calendarDate.getFullYear(), calendarDate.getMonth());

  return (
    <div className={styles.container}>
      <div className={styles.calendar}>
        <div className={styles.header}>
          <h2>{formatDate(currentDate)}</h2>
          <div className={styles.dateControls}>
            <button className={styles.dateBtn} onClick={handlePrevDay} title="Предыдущий день">←</button>
            <button className={styles.calendarIconBtn} onClick={() => setShowDatePicker(v => !v)} title="Выбрать дату">
              <span className={styles.calendarIcon} />
            </button>
            <button className={styles.dateBtn} onClick={handleNextDay} title="Следующий день">→</button>
          </div>
          {showDatePicker && (
            <div className={styles.datePopover} ref={popoverRef}>
              <div className={styles.calendarHeader}>
                <div className={styles.calendarTitle}>
                  {calendarDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                </div>
                <div className={styles.calendarNav}>
                  <button className={styles.calendarNavBtn} onClick={handlePrevMonth}>←</button>
                  <button className={styles.calendarNavBtn} onClick={handleNextMonth}>→</button>
                </div>
              </div>
              <div className={styles.calendarGrid}>
                {weekDays.map(day => (
                  <div key={day} className={styles.weekday}>{day}</div>
                ))}
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`${styles.day} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${day.isToday ? styles.today : ''} ${isSameDay(day.date, currentDate) ? styles.selected : ''}`}
                    onClick={() => handleDayClick(day.date)}
                  >
                    {day.date.getDate()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={styles.slotsGrid}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : slots.length === 0 ? (
            <div className={styles.loading}>Нет бронирований на этот день</div>
          ) : (
            <>
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`${styles.slot} ${slot.isBooked ? styles.booked : ''}`}
                  onClick={() => handleSlotClick(slot)}
                >
                  <div className={styles.time}>
                    {new Date(slot.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(slot.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={styles.bookingInfo}>
                    <b>{slot.bookingDetails?.userName}</b><br/>
                    {slot.bookingDetails?.plan.title}
                  </div>
                </div>
              ))}
              <button className={styles.addBookingBtn} onClick={handleAdminBooking}>
                Добавить бронирование
              </button>
            </>
          )}
        </div>
        {showAvailableSlots && (
          <div className={styles.timeSlots}>
            {allDaySlots.map(slot => {
              const booked = isSlotBooked(slot.formattedTime);
              return (
                <button
                  key={slot.formattedTime}
                  className={
                    styles.timeSlot +
                    (booked ? ' ' + styles.timeSlotUnavailable : '') +
                    (startTime === slot.formattedTime ? ' ' + styles.selectedTime : '')
                  }
                  onClick={() => !booked && handleTimeSlotClick(slot.formattedTime)}
                  disabled={booked}
                >
                  {slot.formattedTime}
                </button>
              );
            })}
          </div>
        )}
        {showCalendarPage && (
          <div className={styles.calendarModalOverlay}>
            <div className={styles.calendarModalContent}>
              <button className={styles.cancelButton} onClick={() => setShowCalendarPage(false)}>Отменить</button>
              <CalendarPage isAdmin={true} />
            </div>
          </div>
        )}
      </div>
      {selectedSlot && selectedSlot.bookingDetails && (
        <div className={styles.slotDetails}>
          <h3>Информация о пользователе</h3>
          <div className={styles.detailItem}>
            <span>Имя:</span>
            <span>{selectedSlot.bookingDetails.userName}</span>
          </div>
          <div className={styles.detailItem}>
            <span>Телефон:</span>
            <span>{selectedSlot.bookingDetails.phone}</span>
          </div>
          <div className={styles.detailItem}>
            <span>Услуга:</span>
            <span>{selectedSlot.bookingDetails.plan.title}</span>
          </div>
          <div className={styles.detailItem}>
            <span>Время:</span>
            <span>{new Date(selectedSlot.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(selectedSlot.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar; 