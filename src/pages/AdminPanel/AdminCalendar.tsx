import React, { useState, useEffect, useRef } from 'react';
import styles from './AdminCalendar.module.css';
import { mockSlots, BookingSlot } from './mockData';
import api from '../../api/apiService';
import TimeSlots from '../CalendarPage/TimeSlots';
import CalendarPage from '../CalendarPage/CalendarPage';
import BookingDetails from './BookingDetails';
import { fetchAvailableTimeSlotsApi, formatTimeSlots } from '../../pages/CalendarPage/calendarApiService';

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

interface BookingDetail {
  id: number;
  start: string;
  end: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  telegramUserId?: number;
  products?: any[];
  price: number;
  status?: string;
  comment?: string;
}

const AdminCalendar: React.FC<{ onUserSelect: (userId: string) => void }> = ({ onUserSelect }) => {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | string | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean>(false);
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
    setSlotsError(null);
    
    try {
      // Используем общую функцию для получения данных слотов
      const apiData = await fetchAvailableTimeSlotsApi(currentDate);
      
      // Используем общую функцию форматирования
      const { formattedTimeSlots, timeSlotsWithData } = formatTimeSlots(apiData);
      
      // Обновляем состояние
      setAvailableTimeSlots(formattedTimeSlots);
      setTimeSlotData(timeSlotsWithData);
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
      try {
        // Форматирование даты для API запроса
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const startDate = `${year}-${month}-${day}T00:00:00`;
        
        // Следующий день для запроса
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextYear = nextDay.getFullYear();
        const nextMonth = (nextDay.getMonth() + 1).toString().padStart(2, '0');
        const nextDayNum = nextDay.getDate().toString().padStart(2, '0');
        const endDate = `${nextYear}-${nextMonth}-${nextDayNum}T00:00:00`;
        
        // Запрос к API для получения бронирований
        const response = await api.get('/calendar/booking', {
          params: { start: startDate, end: endDate }
        });
        
        const data = response.data;
        console.log('Ответ от API:', data);
        
        if (!data || !data.data) {
          throw new Error('Неверный формат данных');
        }
        
        console.log('Количество бронирований:', data.data.length);
        console.log('Пример структуры первого бронирования:', data.data[0] ? {
          bookingId: data.data[0].bookingId,
          typeOfBookingId: typeof data.data[0].bookingId,
          start: data.data[0].start,
          end: data.data[0].end,
          services: data.data[0].services
        } : 'Нет бронирований');
        
        // Выводим для отладки все данные
        for (const booking of data.data) {
          console.log(`Бронирование ID=${booking.bookingId}, время: ${new Date(booking.start).toLocaleTimeString()} - ${new Date(booking.end).toLocaleTimeString()}`);
        }
        
        // Маппинг бронирований
        const bookedSlots = data.data.map((booking: any) => {
          console.log('Данные бронирования из API:', booking);
          
          // Получаем информацию об услуге
          const serviceName = booking.services && booking.services.length > 0 
            ? booking.services[0].serviceName 
            : 'Услуга';
          
          const servicePrice = booking.services && booking.services.length > 0 
            ? booking.services[0].price 
            : 0;
            
          // Очень важно: bookingId должен быть числом для API
          const numericBookingId = Number(booking.bookingId);
          
          // Вспомогательная функция для расчета часов
          const calcHours = (start: string, end: string) => {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const diffMs = endDate.getTime() - startDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            return Math.max(1, Math.round(diffHours));
          };
          
          return {
            id: String(booking.bookingId), // id для React key
            bookingId: numericBookingId, // числовой bookingId для API
            start: booking.start,
            end: booking.end,
            isBooked: true,
            bookingDetails: {
              userId: String(booking.telegramUserId || ''),
              userName: booking.clientName || 'Клиент',
              phone: booking.clientPhone || 'Телефон не указан',
              plan: { 
                title: serviceName,
                price: servicePrice
              },
              hours: calcHours(booking.start, booking.end)
            }
          };
        });
        
        setSlots(bookedSlots);
      } catch (error) {
        console.error('Ошибка при загрузке бронирований:', error);
        setSlots([]);
      } finally {
        setLoading(false);
      }
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
    console.log('Слот, на который нажали:', slot);
    setSelectedSlot(slot);
    
    // Если слот забронирован, показываем детали бронирования
    if (slot.isBooked) {
      console.log('Слот забронирован. bookingId:', slot.bookingId, 'Тип:', typeof slot.bookingId);
      
      // Тут важно проверить наличие bookingId и передать его в числовом формате
      if (slot.bookingId !== undefined) {
        // Преобразуем bookingId в число для API
        const numericBookingId = typeof slot.bookingId === 'string' ? 
          parseInt(slot.bookingId, 10) : 
          slot.bookingId;
        
        console.log('Устанавливаем selectedBookingId:', numericBookingId, 'Тип:', typeof numericBookingId);
        
        setSelectedBookingId(numericBookingId);
        setShowBookingDetails(true);
        
        // ВАЖНО: Не вызываем onUserSelect, иначе произойдет переход на страницу пользователя
        // Раскомментируйте, только если нужно переходить на профиль пользователя
        /*
        if (slot.bookingDetails?.userId) {
          onUserSelect(slot.bookingDetails.userId);
        }
        */
      } else {
        console.error('bookingId не определен в данных слота:', slot);
      }
    } else {
      // Если слот не забронирован, сбрасываем детали
      setSelectedBookingId(null);
      setShowBookingDetails(false);
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

  // Получение детальной информации о бронировании
  const fetchBookingDetail = async (bookingId: number | string) => {
    setLoadingBooking(true);
    setBookingError(null);
    
    try {
      console.log('Загрузка деталей бронирования, ID:', bookingId);
      
      const response = await api.get(`/calendar/booking/${bookingId}`);
      
      if (!response.data) {
        throw new Error('Неверный формат данных');
      }
      
      const bookingData = response.data.data;
      console.log('Получены данные бронирования:', bookingData);
      setBookingDetail(bookingData);
    } catch (error: any) {
      console.error('Ошибка при загрузке данных бронирования:', error);
      setBookingError(`Не удалось загрузить данные: ${error.message}`);
      setBookingDetail(null);
    } finally {
      setLoadingBooking(false);
    }
  };

  const handleCloseBookingDetails = () => {
    console.log('Закрытие панели деталей бронирования');
    setShowBookingDetails(false);
    setSelectedBookingId(null);
  };

  const handleModalOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Закрываем модальное окно при клике на внешнюю область
    if (e.target === e.currentTarget) {
      handleCloseBookingDetails();
    }
  };

  // Добавляем эффект для отслеживания изменений состояний
  useEffect(() => {
    console.log('Состояние изменилось: showBookingDetails =', showBookingDetails, 'selectedBookingId =', selectedBookingId);
  }, [showBookingDetails, selectedBookingId]);

  // Функция для удаления бронирования
  const deleteBooking = async (bookingId: number | string) => {
    try {
      await api.delete(`/calendar/booking/${bookingId}`);
      console.log('Бронирование успешно удалено:', bookingId);
      setDeleteSuccess(true);
      
      // Закрываем детали бронирования и обновляем список
      setTimeout(() => {
        setDeleteSuccess(false);
        handleCloseBookingDetails();
        
        // Обновляем список бронирований
        const fetchSlots = async () => {
          setLoading(true);
          try {
            // Форматирование даты для API запроса
            const year = currentDate.getFullYear();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            const day = currentDate.getDate().toString().padStart(2, '0');
            const startDate = `${year}-${month}-${day}T00:00:00`;
            
            // Следующий день для запроса
            const nextDay = new Date(currentDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextYear = nextDay.getFullYear();
            const nextMonth = (nextDay.getMonth() + 1).toString().padStart(2, '0');
            const nextDayNum = nextDay.getDate().toString().padStart(2, '0');
            const endDate = `${nextYear}-${nextMonth}-${nextDayNum}T00:00:00`;
            
            // Запрос к API для получения бронирований
            const response = await api.get('/calendar/booking', {
              params: { start: startDate, end: endDate }
            });
            
            const data = response.data;
            
            if (!data || !data.data) {
              throw new Error('Неверный формат данных');
            }
            
            // Маппинг бронирований
            const bookedSlots = data.data.map((booking: any) => {
              // Получаем информацию об услуге
              const serviceName = booking.services && booking.services.length > 0 
                ? booking.services[0].serviceName 
                : 'Услуга';
              
              const servicePrice = booking.services && booking.services.length > 0 
                ? booking.services[0].price 
                : 0;
                
              // Очень важно: bookingId должен быть числом для API
              const numericBookingId = Number(booking.bookingId);
              
              // Вспомогательная функция для расчета часов
              const calcHours = (start: string, end: string) => {
                const startDate = new Date(start);
                const endDate = new Date(end);
                const diffMs = endDate.getTime() - startDate.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                return Math.max(1, Math.round(diffHours));
              };
              
              return {
                id: String(booking.bookingId), // id для React key
                bookingId: numericBookingId, // числовой bookingId для API
                start: booking.start,
                end: booking.end,
                isBooked: true,
                bookingDetails: {
                  userId: String(booking.telegramUserId || ''),
                  userName: booking.clientName || 'Клиент',
                  phone: booking.clientPhone || 'Телефон не указан',
                  plan: { 
                    title: serviceName,
                    price: servicePrice
                  },
                  hours: calcHours(booking.start, booking.end)
                }
              };
            });
            
            setSlots(bookedSlots);
          } catch (error) {
            console.error('Ошибка при загрузке бронирований:', error);
            setSlots([]);
          } finally {
            setLoading(false);
          }
        };
        
        fetchSlots();
      }, 2000);
      
      return true;
    } catch (error: any) {
      console.error('Ошибка при удалении бронирования:', error);
      alert(`Ошибка при удалении бронирования: ${error.message}`);
      return false;
    }
  };

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
            <>
            <div className={styles.loading}>Нет бронирований на этот день</div>
            <button className={styles.addBookingBtn} onClick={handleAdminBooking}>
                Добавить бронирование
              </button>
              </>
          ) : (
            <>
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`${styles.slot} ${slot.isBooked ? styles.booked : ''}`}
                  onClick={() => {
                    console.log('Клик по слоту:', slot.id, 'bookingId:', slot.bookingId);
                    handleSlotClick(slot);
                  }}
                >
                  <div className={styles.time}>
                    {new Date(slot.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(slot.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={styles.bookingInfo}>
                    <b>{slot.bookingDetails?.userName}</b><br/>
                    {slot.bookingDetails?.plan.title}
                    <div className={styles.bookingId}>ID: {slot.bookingId}</div>
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
              <CalendarPage isAdmin={true} selectedDate={currentDate} />
            </div>
          </div>
        )}
      </div>
      
      {/* Используем новый компонент для отображения деталей бронирования */}
      {showBookingDetails && selectedBookingId !== null && (() => {
        console.log('Рендеринг BookingDetails с ID:', selectedBookingId, 'тип:', typeof selectedBookingId);
        return (
          <div className={styles.modalOverlay} onClick={handleModalOverlayClick}>
            <div className={styles.modalContent}>
              <BookingDetails 
                bookingId={selectedBookingId} 
                onClose={handleCloseBookingDetails} 
                onEdit={(bookingId) => {
                  console.log('Редактирование бронирования:', bookingId);
                  // Здесь будет логика редактирования бронирования
                  alert(`Редактирование бронирования #${bookingId} (в разработке)`);
                }}
                onCancel={(bookingId) => {
                  console.log('Отмена бронирования:', bookingId);
                  if (window.confirm(`Вы уверены, что хотите отменить бронирование #${bookingId}?`)) {
                    deleteBooking(bookingId);
                  }
                }}
              />
            </div>
          </div>
        );
      })()}
      
      {deleteSuccess && (
        <div className={styles.successPopup}>
          <div className={styles.successPopupContent}>
            <div className={styles.successIcon}>✓</div>
            <p>Бронирование успешно удалено</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar; 