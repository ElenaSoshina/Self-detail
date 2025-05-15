import React, { useState, useEffect } from 'react';
import styles from './CalendarPage.module.css';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContex';
import { v4 as uuidv4 } from 'uuid'; // Для генерации уникальных ID
import axios from 'axios';
import CalendarMonth from './CalendarMonth';
import TimeSlots from './TimeSlots';
import PlanSelection from './PlanSelection';
import BookingSuccess from './BookingSuccess';
import { useCalendarApi } from './useCalendarApi';
import { useBooking } from './useBooking';
import {
  Day,
  PricingPlan,
  BookingDetails,
  TimeSlotWithData,
  AvailabilityData
} from './calendarTypes';
import { generateDaysForMonth, isSameDay, formatDate, calculateMaxAvailableHours } from './calendarUtils';
import { months, weekDays } from './calendarConstants';
import BookingSummary from './BookingSummary';

interface CalendarPageProps {
  isAdmin?: boolean;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ isAdmin }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotWithData[]>([]);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [maxAvailableHours, setMaxAvailableHours] = useState<number>(8); // Максимально возможная продолжительность
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true); // Изначально загрузка включена
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Данные о тарифах
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
      description: 'Слот для внутренних или сервисных работ. Не отображается для клиентов.'
    }] : [])
  ];

  // Запрос доступных слотов с сервера
  const { fetchAvailableTimeSlots, loading, error } = useCalendarApi();

  // useEffect для инициализации
  useEffect(() => {
    if (isInitialized) return; // Пропускаем, если уже инициализировано
    
    const init = async () => {
      const daysArray = generateDaysForMonth(
        currentDate.getFullYear(),
        currentDate.getMonth()
      );
      setDays(daysArray);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDay = daysArray.find(day => day.isToday && day.isAvailable);
      
      setIsInitialized(true); // Помечаем как инициализировано
      
      if (todayDay) {
        setSelectedDate(todayDay.date);
        setLoadingSlots(true);
        try {
          const { formattedTimeSlots, timeSlotsWithData } = await fetchAvailableTimeSlots(todayDay.date);
          setAvailableTimeSlots(formattedTimeSlots);
          setTimeSlotData(timeSlotsWithData);
          setLoadingSlots(false);
        } catch (e) {
          setSlotsError('Ошибка загрузки слотов.');
          setAvailableTimeSlots([]);
          setTimeSlotData([]);
          setLoadingSlots(false);
        }
      } else {
        setLoadingSlots(false);
      }
    };
    
    init();
  }, [isInitialized, fetchAvailableTimeSlots]); // Добавляем зависимости

  // useEffect для смены выбранной даты
  useEffect(() => {
    // Если дата не выбрана или компонент ещё не инициализирован, пропускаем
    if (!selectedDate || !isInitialized) return;
    
    // Создаем переменную для отслеживания актуальности запроса
    let isActive = true;
    
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const { formattedTimeSlots, timeSlotsWithData } = await fetchAvailableTimeSlots(selectedDate);
        
        // Проверяем, актуален ли еще запрос
        if (isActive) {
          setAvailableTimeSlots(formattedTimeSlots);
          setTimeSlotData(timeSlotsWithData);
          setLoadingSlots(false);
          setStartTime(null);
          setEndTime(null);
          setBookingDetails(null);
          setBookingCompleted(false);
        }
      } catch (e) {
        if (isActive) {
          setSlotsError('Ошибка загрузки слотов.');
          setAvailableTimeSlots([]);
          setTimeSlotData([]);
          setLoadingSlots(false);
        }
      }
    };
    
    fetchSlots();
    
    // Функция cleanup для предотвращения обновления состояния после размонтирования
    return () => {
      isActive = false;
    };
  }, [selectedDate, isInitialized, fetchAvailableTimeSlots]); // Добавляем зависимости

  // Обновление дней при изменении текущего месяца - делаем проверку на изменение месяца
  useEffect(() => {
    // Проверяем, действительно ли изменился месяц
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    // Запоминаем текущий месяц и год в ref или состоянии
    if (isInitialized && days.length > 0) {
      // Получаем месяц и год из первого дня в массиве
      const currentMonth = days[15].date.getMonth(); // Берем день в середине массива
      const currentYear = days[15].date.getFullYear();
      
      // Сравниваем с выбранными месяцем и годом
      if (month === currentMonth && year === currentYear) {
        // Месяц не изменился, пропускаем обновление
        return;
      }
      
      console.log('Обновление месяца:', currentDate);
      const daysArray = generateDaysForMonth(year, month);
      setDays(daysArray);
    }
  }, [currentDate, days.length, isInitialized]);

  // Переключение на предыдущий месяц
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() - 1);
      return newDate;
    });
    setSelectedDate(null);
  };

  // Переключение на следующий месяц
  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + 1);
      return newDate;
    });
    setSelectedDate(null);
  };

  // handleDateClick теперь просто меняет selectedDate
  const handleDateClick = (day: Day) => {
    if (day.isAvailable) {
      setSelectedDate(day.date);
    }
  };

  // handleTimeSlotClick теперь работает с двумя слотами
  const handleTimeSlotClick = (slot: string) => {
    if (!startTime || (startTime && endTime)) {
      setStartTime(slot);
      setEndTime(null);
    } else if (startTime && !endTime) {
      if (slot === startTime) {
        setStartTime(null);
        setEndTime(null);
      } else {
        setEndTime(slot);
      }
    }
  };

  // Расчёт продолжительности аренды
  let duration = null;
  if (startTime && endTime) {
    const start = timeSlotData.find(s => s.formattedTime === startTime)?.start;
    const end = timeSlotData.find(s => s.formattedTime === endTime)?.start;
    if (start && end) {
      const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      duration = diff > 0 ? diff : null;
    }
  }

  // Добавление бронирования в корзину
  const addBookingToCart = () => {
    if (bookingDetails) {
      const formattedDate = formatDate(bookingDetails.date);
      const bookingItem = {
        id: uuidv4(),
        name: `${bookingDetails.plan.title} (${formattedDate}, ${bookingDetails.timeRange})`,
        price: bookingDetails.totalPrice,
        type: 'booking',
        region: '',
        details: `Бронирование на ${bookingDetails.duration.toFixed(2)} ч. | ${bookingDetails.timeRange}`,
        icon: bookingDetails.plan.icon,
      };
      addToCart(bookingItem);
      navigate('/');
    }
  };

  // Перейти в каталог с добавленным бронированием
  const goToProducts = () => {
    if (bookingDetails) {
      const formattedDate = formatDate(bookingDetails.date);
      const bookingItem = {
        id: uuidv4(),
        name: `${bookingDetails.plan.title} (${formattedDate}, ${bookingDetails.timeRange})`,
        price: bookingDetails.totalPrice,
        type: 'booking',
        region: '',
        details: `Бронирование на ${bookingDetails.duration.toFixed(2)} ч. | ${bookingDetails.timeRange}`,
        icon: bookingDetails.plan.icon,
      };
      addToCart(bookingItem);
      navigate('/products');
    }
  };

  // Получение текущего месяца и года для заголовка
  const currentMonthYear = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // Расчет итоговой стоимости
  const calculateTotalPrice = () => {
    if (!selectedPlan) return 0;
    return selectedPlan.price * hours;
  };

  const { selectedPlan, setSelectedPlan, hours, setHours, handlePlanClick, handleHoursChange, handleBooking } = useBooking();

  // Формируем строку времени для отображения
  let timeRange = '';
  if (startTime && endTime) {
    const startIdx = availableTimeSlots.indexOf(startTime);
    const endIdx = availableTimeSlots.indexOf(endTime);
    if (startIdx !== -1 && endIdx !== -1) {
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      timeRange = `${availableTimeSlots[from]} — ${availableTimeSlots[to]}`;
    }
  }
  // duration
  let calcDuration: number | null = null;
  if (startTime && endTime) {
    const start = timeSlotData.find(s => s.formattedTime === startTime)?.start;
    const end = timeSlotData.find(s => s.formattedTime === endTime)?.start;
    if (start && end) {
      const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      calcDuration = diff > 0 ? diff : null;
    }
  }
  const totalPrice = selectedPlan && calcDuration ? selectedPlan.price * calcDuration : 0;

  // onBook теперь сохраняет все нужные данные в bookingDetails
  const onBook = () => {
    if (selectedDate && startTime && endTime && selectedPlan && calcDuration && timeRange) {
      setBookingDetails({
        date: selectedDate,
        timeRange,
        duration: calcDuration,
        plan: selectedPlan,
        totalPrice
      });
      setBookingCompleted(true);
    }
  };

  // Генерируем полный массив слотов за сутки (00:00-01:00 ... 23:00-00:00)
  const allDaySlots: { formattedTime: string; start: string; end: string }[] = [];
  for (let h = 0; h < 24; h++) {
    const start = `${h < 10 ? '0' + h : h}:00`;
    const end = `${(h + 1) < 10 ? '0' + (h + 1) : (h + 1 === 24 ? '00' : h + 1)}:00`;
    allDaySlots.push({
      formattedTime: start,
      start,
      end
    });
  }

  return (
    <div className={isAdmin ? `${styles.calendarContainer} ${styles.admin}` : styles.calendarContainer}>
      {!bookingCompleted && (
        <div className={styles.calendarHeader}>
          <h1 className={styles.title}>Выберите дату и время</h1>
          {!isAdmin && (
            <button className={styles.backButton} onClick={() => navigate('/')}>Назад</button>
          )}
        </div>
      )}
      {!bookingCompleted ? (
        <div className={styles.calendarContent}>
          <div className={styles.calendar}>
            <div className={styles.calendarNav}>
              <button className={styles.navButton} onClick={goToPreviousMonth}>&#10094;</button>
              <h2 className={styles.currentMonth}>{currentMonthYear}</h2>
              <button className={styles.navButton} onClick={goToNextMonth}>&#10095;</button>
            </div>
            <div className={styles.weekdays}>
              {weekDays.map(day => (
                <div key={day} className={styles.weekday}>{day}</div>
              ))}
            </div>
            <CalendarMonth
              days={days}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
              isSameDay={isSameDay}
            />
          </div>
          <div className={styles.bookingSelection}>
            <TimeSlots
              selectedDate={selectedDate}
              loadingSlots={loadingSlots}
              slotsError={slotsError}
              allDaySlots={allDaySlots}
              availableTimeSlots={availableTimeSlots}
              startTime={startTime}
              endTime={endTime}
              onTimeSlotClick={handleTimeSlotClick}
              formatDate={formatDate}
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
    </div>
  );
};

export default CalendarPage; 