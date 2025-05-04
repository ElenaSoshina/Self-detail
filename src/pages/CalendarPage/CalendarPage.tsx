import React, { useState, useEffect } from 'react';
import styles from './CalendarPage.module.css';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContex';
import { v4 as uuidv4 } from 'uuid'; // Для генерации уникальных ID

interface Day {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isAvailable: boolean;
}

interface PricingPlan {
  id: string;
  title: string;
  price: number;
  icon: string;
  description: string;
}

// Интерфейс для бронирования
interface BookingDetails {
  id: string;
  date: Date;
  time: string;
  plan: PricingPlan;
  hours: number;
  totalPrice: number;
}

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [hours, setHours] = useState<number>(1);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [bookingCompleted, setBookingCompleted] = useState(false);

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
    }
  ];

  // Массив названий месяцев
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Массив названий дней недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Генерация дней для текущего месяца
  useEffect(() => {
    const daysArray = generateDaysForMonth(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );
    setDays(daysArray);
  }, [currentDate]);

  // Генерация временных слотов при выборе даты
  useEffect(() => {
    if (selectedDate) {
      // Здесь в реальном приложении был бы запрос к API
      // Для примера генерируем случайные доступные слоты
      const slots = generateMockTimeSlots(selectedDate);
      setAvailableTimeSlots(slots);
    } else {
      setAvailableTimeSlots([]);
    }
    setSelectedTime(null);
    setSelectedPlan(null);
    setBookingDetails(null);
    setBookingCompleted(false);
  }, [selectedDate]);

  // Сброс выбранного тарифа при изменении времени
  useEffect(() => {
    setSelectedPlan(null);
    setBookingDetails(null);
    setBookingCompleted(false);
  }, [selectedTime]);

  // Функция для генерации дней месяца
  const generateDaysForMonth = (year: number, month: number): Day[] => {
    const result: Day[] = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Находим день недели первого дня месяца (0 - воскресенье, 1 - понедельник)
    let firstDayWeekday = firstDayOfMonth.getDay() || 7;
    firstDayWeekday = firstDayWeekday === 0 ? 7 : firstDayWeekday; // Переводим воскресенье из 0 в 7
    
    // Добавляем дни предыдущего месяца
    const daysFromPrevMonth = firstDayWeekday - 1;
    const prevMonth = new Date(year, month, 0);
    for (let i = prevMonth.getDate() - daysFromPrevMonth + 1; i <= prevMonth.getDate(); i++) {
      const date = new Date(year, month - 1, i);
      result.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date()),
        isAvailable: false // дни предыдущего месяца недоступны
      });
    }
    
    // Добавляем дни текущего месяца
    const today = new Date();
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      const isDateAvailable = date >= today; // доступны только будущие даты
      
      result.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        isAvailable: isDateAvailable
      });
    }
    
    // Добавляем дни следующего месяца, чтобы заполнить сетку (до 42 дней - 6 недель)
    const remainingDays = 42 - result.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      result.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isAvailable: true // дни следующего месяца доступны
      });
    }
    
    return result;
  };

  // Проверка на один и тот же день
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Генерация временных слотов (имитация)
  const generateMockTimeSlots = (date: Date): string[] => {
    // В реальном приложении здесь был бы API-запрос
    const slots = [];
    const startHour = 9;
    const endHour = 20;
    
    // Случайно генерируем доступные слоты
    for (let hour = startHour; hour <= endHour; hour++) {
      // 50% шанс доступности каждого часа
      if (Math.random() > 0.5) {
        slots.push(`${hour}:00`);
      }
      
      // 30% шанс доступности получасовых слотов
      if (Math.random() > 0.7) {
        slots.push(`${hour}:30`);
      }
    }
    
    return slots.sort();
  };

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

  // Обработчик выбора даты
  const handleDateClick = (day: Day) => {
    if (day.isAvailable) {
      setSelectedDate(day.date);
    }
  };

  // Обработчик выбора времени
  const handleTimeSlotClick = (timeSlot: string) => {
    setSelectedTime(timeSlot);
  };

  // Обработчик выбора тарифа
  const handlePlanClick = (plan: PricingPlan) => {
    setSelectedPlan(plan);
  };

  // Обработчик изменения количества часов
  const handleHoursChange = (newHours: number) => {
    setHours(Math.max(1, Math.min(newHours, 8))); // Ограничиваем от 1 до 8 часов
  };

  // Обработчик бронирования
  const handleBooking = () => {
    if (selectedDate && selectedTime && selectedPlan) {
      const booking: BookingDetails = {
        id: uuidv4(), // Генерируем уникальный ID
        date: selectedDate,
        time: selectedTime,
        plan: selectedPlan,
        hours: hours,
        totalPrice: selectedPlan.price * hours
      };
      
      setBookingDetails(booking);
      setBookingCompleted(true);
    }
  };

  // Добавление бронирования в корзину
  const addBookingToCart = () => {
    if (bookingDetails) {
      const formattedDate = formatDate(bookingDetails.date);
      const bookingItem = {
        id: bookingDetails.id,
        name: `${bookingDetails.plan.title} (${formattedDate}, ${bookingDetails.time})`,
        price: bookingDetails.totalPrice, // Используем общую стоимость за все часы
        type: 'booking',
        region: '',
        details: `Бронирование на ${bookingDetails.hours} ч. | ${bookingDetails.time}`,
        icon: bookingDetails.plan.icon, // Добавляем иконку тарифа
      };

      addToCart(bookingItem);
      
      // Перенаправляем на главную страницу
      navigate('/');
    }
  };

  // Перейти в каталог с добавленным бронированием
  const goToProducts = () => {
    if (bookingDetails) {
      const formattedDate = formatDate(bookingDetails.date);
      const bookingItem = {
        id: bookingDetails.id,
        name: `${bookingDetails.plan.title} (${formattedDate}, ${bookingDetails.time})`,
        price: bookingDetails.totalPrice, // Используем общую стоимость за все часы
        type: 'booking',
        region: '',
        details: `Бронирование на ${bookingDetails.hours} ч. | ${bookingDetails.time}`,
        icon: bookingDetails.plan.icon, // Добавляем иконку тарифа
      };

      addToCart(bookingItem);
      
      // Перенаправляем на страницу товаров
      navigate('/products');
    }
  };

  // Форматирование даты
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Получение текущего месяца и года для заголовка
  const currentMonthYear = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // Расчет итоговой стоимости
  const calculateTotalPrice = () => {
    if (!selectedPlan) return 0;
    return selectedPlan.price * hours;
  };

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <h1 className={styles.title}>Выберите дату и время</h1>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          Назад
        </button>
      </div>
      
      {!bookingCompleted ? (
        <div className={styles.calendarContent}>
          <div className={styles.calendar}>
            <div className={styles.calendarNav}>
              <button 
                className={styles.navButton} 
                onClick={goToPreviousMonth}
              >
                &#10094;
              </button>
              <h2 className={styles.currentMonth}>{currentMonthYear}</h2>
              <button 
                className={styles.navButton} 
                onClick={goToNextMonth}
              >
                &#10095;
              </button>
            </div>
            
            <div className={styles.weekdays}>
              {weekDays.map(day => (
                <div key={day} className={styles.weekday}>{day}</div>
              ))}
            </div>
            
            <div className={styles.daysGrid}>
              {days.map((day, index) => (
                <div 
                  key={index}
                  className={`
                    ${styles.day} 
                    ${!day.isCurrentMonth ? styles.otherMonth : ''} 
                    ${day.isToday ? styles.today : ''} 
                    ${day.isAvailable ? styles.available : styles.unavailable}
                    ${selectedDate && isSameDay(day.date, selectedDate) ? styles.selected : ''}
                  `}
                  onClick={() => handleDateClick(day)}
                >
                  {day.date.getDate()}
                  {day.isToday && <span className={styles.todayMark}></span>}
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.bookingSelection}>
            {/* Секция выбора времени */}
            <div className={styles.timeSelection}>
              {selectedDate ? (
                <>
                  <h3 className={styles.sectionTitle}>
                    {formatDate(selectedDate)}
                  </h3>
                  
                  {availableTimeSlots.length > 0 ? (
                    <div className={styles.timeSlots}>
                      {availableTimeSlots.map(time => (
                        <button 
                          key={time}
                          className={`${styles.timeSlot} ${selectedTime === time ? styles.selectedTime : ''}`}
                          onClick={() => handleTimeSlotClick(time)}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noTimeSlotsMessage}>
                      Нет доступных слотов на выбранную дату
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.selectDateMessage}>
                  Выберите дату для просмотра доступного времени
                </div>
              )}
            </div>
            
            {/* Секция выбора тарифа */}
            {selectedTime && (
              <div className={styles.planSelection}>
                <h3 className={styles.sectionTitle}>Выберите тариф</h3>
                
                <div className={styles.planGrid}>
                  {pricingPlans.map((plan) => (
                    <div 
                      key={plan.id}
                      className={`${styles.planCard} ${selectedPlan?.id === plan.id ? styles.selectedPlan : ''}`}
                      onClick={() => handlePlanClick(plan)}
                    >
                      <div className={styles.planIcon}>{plan.icon}</div>
                      <h4 className={styles.planTitle}>{plan.title}</h4>
                      <div className={styles.planPrice}>{plan.price} ₽/ч</div>
                      <p className={styles.planDescription}>{plan.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Секция выбора количества часов и итоговой стоимости */}
            {selectedPlan && (
              <div className={styles.durationSelection}>
                <h3 className={styles.sectionTitle}>Выберите продолжительность</h3>
                
                <div className={styles.hoursControls}>
                  <button 
                    className={styles.hoursButton}
                    onClick={() => handleHoursChange(hours - 1)}
                    disabled={hours <= 1}
                  >
                    -
                  </button>
                  <div className={styles.hoursDisplay}>
                    <span className={styles.hoursValue}>{hours}</span> ч.
                  </div>
                  <button 
                    className={styles.hoursButton}
                    onClick={() => handleHoursChange(hours + 1)}
                    disabled={hours >= 8}
                  >
                    +
                  </button>
                </div>
                
                <div className={styles.totalPrice}>
                  <span>Итого:</span>
                  <span className={styles.priceValue}>{calculateTotalPrice()} ₽</span>
                </div>
                
                <button 
                  className={styles.bookButton}
                  onClick={handleBooking}
                >
                  Забронировать
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.bookingCompletedContainer}>
          <div className={styles.bookingSuccessCard}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Бронирование выполнено успешно!</h2>
            
            <div className={styles.bookingDetails}>
              <div className={styles.bookingDetail}>
                <span className={styles.detailLabel}>Дата:</span>
                <span className={styles.detailValue}>{formatDate(bookingDetails!.date)}</span>
              </div>
              <div className={styles.bookingDetail}>
                <span className={styles.detailLabel}>Время:</span>
                <span className={styles.detailValue}>{bookingDetails!.time}</span>
              </div>
              <div className={styles.bookingDetail}>
                <span className={styles.detailLabel}>Тариф:</span>
                <span className={styles.detailValue}>{bookingDetails!.plan.title}</span>
              </div>
              <div className={styles.bookingDetail}>
                <span className={styles.detailLabel}>Продолжительность:</span>
                <span className={styles.detailValue}>{bookingDetails!.hours} ч.</span>
              </div>
              <div className={styles.bookingDetail}>
                <span className={styles.detailLabel}>Стоимость:</span>
                <span className={styles.detailValue}>{bookingDetails!.totalPrice} ₽</span>
              </div>
            </div>
            
            <h3 className={styles.productsTitle}>Хотите добавить товары для бокса?</h3>
            <p className={styles.productsDescription}>
              Вы можете выбрать дополнительные средства, которые будут вас ждать в боксе.
            </p>
            
            <div className={styles.actionButtons}>
              <button 
                className={styles.addProductsButton}
                onClick={goToProducts}
              >
                Добавить товары
              </button>
              
              <button 
                className={styles.skipButton}
                onClick={addBookingToCart}
              >
                Нет, спасибо
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage; 