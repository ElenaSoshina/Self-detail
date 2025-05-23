import React, { useState, useEffect } from 'react';
import styles from './CalendarPage.module.css';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContex';
import { v4 as uuidv4 } from 'uuid';
import CalendarMonth from './CalendarMonth';
import TimeSlots from './TimeSlots';
import PlanSelection from './PlanSelection';
import BookingSuccess from './BookingSuccess';
import { useCalendarApi } from './useCalendarApi';
import { useBooking } from './useBooking';
import BookingModal from '../../components/BookingModal/BookingModal';
import {
  Day,
  PricingPlan,
  BookingDetails,
  TimeSlotWithData,
} from './calendarTypes';
import {
  generateDaysForMonth,
  isSameDay,
  formatDate,
} from './calendarUtils';
import { months, weekDays } from './calendarConstants';
import BookingSummary from './BookingSummary';
import api from '../../api/apiService';

interface CalendarPageProps {
  isAdmin?: boolean;
  selectedDate?: Date | null;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ isAdmin, selectedDate: externalSelectedDate }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  /** ——————————————————— State ——————————————————— */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(externalSelectedDate ?? null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotWithData[]>([]);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [forcedAvailableSlot, setForcedAvailableSlot] = useState<string | null>(null);

  /** ——————————————————— Pricing ——————————————————— */
  const pricingPlans: PricingPlan[] = [
    {
      id: 'wash',
      title: 'Мойка авто',
      price: 800,
      icon: '💦',
      description: 'АВД, пенокомплекты, автошампунь, воск, водсгон, губки, тряпки, пылесос.'
    },
    {
      id: 'dry',
      title: 'Сухой пост',
      price: 500,
      icon: '🔌',
      description: 'Розетка 220V и воздух под давлением. Для работы со своими средствами и оборудованием.'
    },
    {
      id: 'cleaning',
      title: 'Химчистка',
      price: 800,
      icon: '🧽',
      description: 'Торнадор, моющий пылесос, средства для химчистки тканевых поверхностей и кожи.'
    },
    {
      id: 'polish',
      title: 'Полировка',
      price: 800,
      icon: '✨',
      description: 'Полировочная машинка, подложки, средства для хим. чистки кузова. Паста и круги не включены.'
    },
    ...(isAdmin ? [{
      id: 'tech',
      title: 'Технические работы',
      price: 0,
      icon: '🛠️',
      description: 'Сlot для внутренних или сервисных работ. Не отображается для клиентов.'
    }] : [])
  ];

  /** ——————————————————— API hooks ——————————————————— */
  const { fetchAvailableTimeSlots } = useCalendarApi();
  const {
    selectedPlan,
    handlePlanClick,
  } = useBooking();

  /** ——————————————————— Init ——————————————————— */
  useEffect(() => {
    if (isInitialized) return;

    const init = async () => {
      const daysArray = generateDaysForMonth(currentDate.getFullYear(), currentDate.getMonth());
      setDays(daysArray);

      let initialDay: Day | undefined;
      if (externalSelectedDate) {
        initialDay = daysArray.find(d => d.date.toDateString() === externalSelectedDate.toDateString());
      } else {
        initialDay = daysArray.find(d => d.isToday && d.isAvailable);
      }
      setIsInitialized(true);

      if (!initialDay) {
        setLoadingSlots(false);
        return;
      }

      setSelectedDate(initialDay.date);
      setLoadingSlots(true);
      try {
        const { formattedTimeSlots, timeSlotsWithData } = await fetchAvailableTimeSlots(initialDay.date);
        setAvailableTimeSlots(formattedTimeSlots);
        setTimeSlotData(timeSlotsWithData);
      } catch {
        setSlotsError('Ошибка загрузки слотов.');
      } finally {
        setLoadingSlots(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ——————————————————— Load slots on date change ——————————————————— */
  useEffect(() => {
    if (!selectedDate || !isInitialized) return;
    let cancelled = false;

    (async () => {
      setLoadingSlots(true);
      try {
        const { formattedTimeSlots, timeSlotsWithData } = await fetchAvailableTimeSlots(selectedDate);
        if (cancelled) return;
        setAvailableTimeSlots(formattedTimeSlots);
        setTimeSlotData(timeSlotsWithData);
        setStartTime(null);
        setEndTime(null);
        setBookingDetails(null);
        setBookingCompleted(false);
      } catch {
        if (!cancelled) {
          setSlotsError('Ошибка загрузки слотов.');
          setAvailableTimeSlots([]);
          setTimeSlotData([]);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedDate, isInitialized, fetchAvailableTimeSlots]);

  /** ——————————————————— Month navigation ——————————————————— */
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  /** ——————————————————— Date click ——————————————————— */
  const handleDateClick = (day: Day) => {
    if (!day.isAvailable) return;
    setSelectedDate(day.date);    // подсветка происходит мгновенно через selectedDate
  };

  /** ——————————————————— Time-slot click ——————————————————— */
  const handleTimeSlotClick = (slot: string, isForced?: boolean) => {
    // Обработка специального значения для сброса выбора
    if (slot === "reset") {
      setStartTime(null);
      setEndTime(null);
      setForcedAvailableSlot(null);
      return;
    }

    // Если идет загрузка или слот прошедший - игнорируем клик
    if (loadingSlots) return;
    
    const past = isPastSlot(slot);
    if (past) return;

    // сброс, если нажали на уже выбранное начало
    if (startTime === slot) {
      setStartTime(null);
      setEndTime(null);
      setForcedAvailableSlot(null);
      return;
    }

    // если нет начала или диапазон уже закончен ⇒ начинаем новый выбор
    if (!startTime || endTime) {
      setStartTime(slot);
      setEndTime(null);
      return;
    }

    // второй клик – пытаемся поставить конец
    const startIdx = allDaySlots.findIndex(s => s.formattedTime === startTime);
    const endIdx = allDaySlots.findIndex(s => s.formattedTime === slot);
    if (endIdx <= startIdx) return;                        // назад нельзя

    // убеждаемся, что весь промежуток между границами свободен
    let allSlotsAvailable = true;
    for (let i = startIdx + 1; i < endIdx; i++) {
      const currentSlot = allDaySlots[i].formattedTime;
      if (!availableTimeSlots.includes(currentSlot)) {
        allSlotsAvailable = false;
        break;
      }
    }

    // Устанавливаем конец только если все промежуточные слоты доступны
    // или если слот следует сразу за начальным
    if (allSlotsAvailable || endIdx === startIdx + 1) {
      setEndTime(slot);
      setForcedAvailableSlot(null);
    }
  };
  
  // Вспомогательная функция для проверки, является ли слот прошедшим
  const isPastSlot = (slotTime: string): boolean => {
    if (!selectedDate) return false;
    
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    if (!isToday) return false;
    
    const [slotHour, slotMinute] = slotTime.split(":").map(Number);
    const slotDate = new Date(selectedDate);
    slotDate.setHours(slotHour, slotMinute, 0, 0);
    
    const buffer = 5 * 60 * 1000; // 5 минут в миллисекундах
    return slotDate.getTime() <= (now.getTime() + buffer);
  };

  /** ——————————————————— All 24h slots (local) ——————————————————— */
  const allDaySlots = Array.from({ length: 24 }, (_, h) => {
    const start = `${h.toString().padStart(2, '0')}:00`;
    const end = `${((h + 1) % 24).toString().padStart(2, '0')}:00`;
    return { formattedTime: start, start, end };
  });

  /** ——————————————————— Helpers ——————————————————— */
  const getDuration = () => {
    if (!startTime || !endTime) return null;
    const start = timeSlotData.find(s => s.formattedTime === startTime)?.start;
    let end = timeSlotData.find(s => s.formattedTime === endTime)?.start;
    if (!start) return null;
    if (!end) {
      // Если endTime не найден в timeSlotData (занятый слот), ищем его индекс в allDaySlots
      const allIdx = allDaySlots.findIndex(s => s.formattedTime === endTime);
      if (allIdx !== -1 && allIdx > 0 && selectedDate) {
        // Берём start этого слота как конец диапазона
        const slotDate = new Date(selectedDate);
        const [h, m] = endTime.split(":").map(Number);
        slotDate.setHours(h, m, 0, 0);
        end = slotDate;
      }
    }
    if (!end) return null;
    return (end.getTime() - start.getTime()) / 3_600_000; // hours
  };

  const duration = getDuration();

  const timeRange = duration !== null
    ? `${startTime} — ${endTime}`
    : '';

  /** ——————————————————— Booking handlers ——————————————————— */
  const onBook = () => {
    if (!selectedDate || !duration || !selectedPlan || !startTime || !endTime) return;
    const totalPrice = selectedPlan.price * duration;
    
    // Если выбраны технические работы и пользователь - администратор, показываем модальное окно с предзаполненными полями
    if (isAdmin && selectedPlan.id === 'tech') {
      setBookingDetails({
        date: selectedDate,
        timeRange,
        duration,
        plan: selectedPlan,
        totalPrice,
      });
      setShowBookingModal(true);
    } else {
      // Для всех остальных случаев используем стандартный поток
      setBookingDetails({
        date: selectedDate,
        timeRange,
        duration,
        plan: selectedPlan,
        totalPrice,
      });
      setBookingCompleted(true);
    }
  };

  // Обработчик завершения бронирования из модального окна
  const handleBookingComplete = (formData: any) => {
    console.log('Бронирование успешно завершено:', formData);
    setShowBookingModal(false);
    
    // Сбрасываем выбранное время
    setStartTime(null);
    setEndTime(null);
    
    // Если мы находимся на странице администратора, перезагружаем страницу
    if (isAdmin) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const addBookingToCart = () => {
    if (!bookingDetails) return;
    const formattedDate = formatDate(bookingDetails.date);
    addToCart({
      id: uuidv4(),
      name: `${bookingDetails.plan.title} (${formattedDate}, ${bookingDetails.timeRange})`,
      price: bookingDetails.totalPrice,
      type: 'booking',
      region: '',
      details: `Бронирование на ${bookingDetails.duration.toFixed(2)} ч. | ${bookingDetails.timeRange}`,
    });
    navigate('/');
  };

  const goToProducts = () => {
    addBookingToCart();
    navigate('/products');
  };

  /** ——————————————————— Render ——————————————————— */
  const currentMonthYear = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const handleRangeSelect = (start: string | null, end: string | null) => {
    setStartTime(start);
    setEndTime(end);
  };

  // Обновление сетки дней при смене месяца
  useEffect(() => {
    const daysArray = generateDaysForMonth(currentDate.getFullYear(), currentDate.getMonth());
    setDays(daysArray);
  }, [currentDate]);

  return (
    <div className={isAdmin ? `${styles.calendarContainer} ${styles.admin}` : styles.calendarContainer}>
      {/* ——— header ——— */}
      {!bookingCompleted && (
        <div className={styles.calendarHeader}>
          <h1 className={styles.title}>Выберите дату и время</h1>
          {!isAdmin && (
            <button className={styles.backButton} onClick={() => navigate('/')}>Назад</button>
          )}
        </div>
      )}

      {/* ——— main content ——— */}
      {!bookingCompleted ? (
        <div className={styles.calendarContent}>
          {/* ——— calendar ——— */}
          <div className={styles.calendar}>
            <div className={styles.calendarNav}>
              <button className={styles.navButton} onClick={goToPreviousMonth}>&#10094;</button>
              <h2 className={styles.currentMonth}>{currentMonthYear}</h2>
              <button className={styles.navButton} onClick={goToNextMonth}>&#10095;</button>
            </div>
            <div className={styles.weekdays}>
              {weekDays.map(day => <div key={day} className={styles.weekday}>{day}</div>)}
            </div>
            <CalendarMonth
              days={days}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
              isSameDay={isSameDay}
            />
          </div>

          {/* ——— booking panel ——— */}
          <div className={styles.bookingSelection}>
            <TimeSlots
              selectedDate={selectedDate}
              loadingSlots={loadingSlots}
              slotsError={slotsError}
              allDaySlots={allDaySlots}
              availableTimeSlots={availableTimeSlots}
              formatDate={formatDate}
              timeSlotData={timeSlotData}
              onRangeSelect={handleRangeSelect}
              startTime={startTime}
              endTime={endTime}
            />

            {duration && (
              <>
                <PlanSelection
                  pricingPlans={pricingPlans}
                  selectedPlan={selectedPlan}
                  onPlanClick={handlePlanClick}
                />
                {selectedPlan && (
                  <BookingSummary
                    selectedDate={selectedDate}
                    startTime={startTime}
                    endTime={endTime}
                    duration={duration}
                    selectedPlan={selectedPlan}
                    onBook={onBook}
                    formatDate={formatDate}
                  />
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        bookingDetails && (
          <BookingSuccess
            bookingDetails={bookingDetails}
            formatDate={formatDate}
            goToProducts={goToProducts}
            addBookingToCart={addBookingToCart}
            onBack={() => setBookingCompleted(false)}
          />
        )
      )}
      
      {/* Модальное окно для технических работ с предзаполненными полями */}
      {showBookingModal && bookingDetails && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          startTime={startTime || ''}
          endTime={endTime || ''}
          service={{
            serviceName: 'Технические работы',
            price: 0
          }}
          onSubmit={handleBookingComplete}
          selectedDate={selectedDate}
          isAdmin={true}
          prefilledData={{
            name: 'Администратор',
            phone: '+79999999999',
            email: 'admin@admin.com',
            telegramUserName: '@admin'
          }}
        />
      )}
    </div>
  );
};

export default CalendarPage;