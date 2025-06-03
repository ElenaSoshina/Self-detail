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
  excludeBookingId?: number | string;
  onSubmit?: (formData: any) => void;
  editMode?: boolean;
  editBookingId?: number | string;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ isAdmin, selectedDate: externalSelectedDate, excludeBookingId, onSubmit, editMode = false, editBookingId }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  /** ——————————————————— State ——————————————————— */
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(externalSelectedDate ?? null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [nextDayTimeSlots, setNextDayTimeSlots] = useState<string[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotWithData[]>([]);
  const [nextDayTimeSlotData, setNextDayTimeSlotData] = useState<TimeSlotWithData[]>([]);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [startTimeContext, setStartTimeContext] = useState<'current' | 'next' | null>(null);
  const [endTimeContext, setEndTimeContext] = useState<'current' | 'next' | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [forcedAvailableSlot, setForcedAvailableSlot] = useState<string | null>(null);
  const [currentBookingData, setCurrentBookingData] = useState<any>(null);
  const [preSelectedSlots, setPreSelectedSlots] = useState<string[]>([]);

  /** ——————————————————— Pricing ——————————————————— */
  const pricingPlans: PricingPlan[] = [
    {
      id: 'all-inclusive',
      title: 'Все включено',
      price: 800,
      icon: '✨',
      description: 'Есть все для того чтобы помыть авто и сделать хим чистку. С собой можно ничего не брать.'
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

  /** ——————————————————— Auto-select plan for non-admin users ——————————————————— */
  useEffect(() => {
    if (!isAdmin && !selectedPlan) {
      const defaultPlan = pricingPlans.find(plan => plan.id === 'all-inclusive');
      if (defaultPlan) {
        handlePlanClick(defaultPlan);
      }
    }
  }, [isAdmin, selectedPlan, pricingPlans, handlePlanClick]);

  /** ——————————————————— Load slots on date change ——————————————————— */
  useEffect(() => {
    if (!selectedDate || !isInitialized) return;
    let cancelled = false;

    (async () => {
      setLoadingSlots(true);
      try {
        // Получаем слоты текущего дня
        const { formattedTimeSlots, timeSlotsWithData } = await fetchAvailableTimeSlots(selectedDate, excludeBookingId);
        if (cancelled) return;
        setAvailableTimeSlots(formattedTimeSlots);
        setTimeSlotData(timeSlotsWithData);

        // Получаем слоты следующего дня
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const { formattedTimeSlots: nextDaySlots, timeSlotsWithData: nextDayData } = await fetchAvailableTimeSlots(nextDay, excludeBookingId);
        if (cancelled) return;

        // Создаем первые 4 слота следующего дня (00:00, 01:00, 02:00, 03:00) независимо от доступности
        const firstFourHours = ['00:00', '01:00', '02:00', '03:00'];
        const firstFourData = firstFourHours.map(time => {
          // Ищем данные для этого времени в ответе API
          const existingData = nextDayData.find(slot => slot.formattedTime === time);
          if (existingData) {
            return existingData;
          }
          
          // Если слота нет в API ответе, создаем его как недоступный
          const nextDayDate = new Date(nextDay);
          const [hour] = time.split(':').map(Number);
          nextDayDate.setHours(hour, 0, 0, 0);
          
          return {
            formattedTime: time,
            originalData: null,
            sortKey: hour * 60,
            start: nextDayDate,
            end: new Date(nextDayDate.getTime() + 60 * 60 * 1000), // +1 час
            available: false
          };
        });

        setNextDayTimeSlots(firstFourHours);
        setNextDayTimeSlotData(firstFourData);

        setStartTime(null);
        setEndTime(null);
        setStartTimeContext(null);
        setEndTimeContext(null);
        setBookingDetails(null);
        setBookingCompleted(false);
      } catch (error) {
        if (!cancelled) {
          setSlotsError('Ошибка загрузки слотов.');
          setAvailableTimeSlots([]);
          setTimeSlotData([]);
          setNextDayTimeSlots([]);
          setNextDayTimeSlotData([]);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedDate, isInitialized, fetchAvailableTimeSlots, excludeBookingId]);

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

    // Если это слот следующего дня - не обрабатываем здесь
    if (nextDayTimeSlots.includes(slot)) {
      return;
    }

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
  const allDaySlots = Array.from({ length: 25 }, (_, h) => {
    const start = `${h.toString().padStart(2, '0')}:00`;
    const end = `${((h + 1) % 24).toString().padStart(2, '0')}:00`;
    return { formattedTime: start, start, end };
  });

  /** ——————————————————— Helpers ——————————————————— */
  // Вспомогательная функция для проверки, доступен ли слот в текущем дне (включая граничные)
  const isSlotAvailableInCurrentDay = (slotTime: string): boolean => {
    // Проверяем, есть ли слот в доступных слотах текущего дня
    if (availableTimeSlots.includes(slotTime)) return true;
    
    // Проверяем, является ли слот граничным (может быть выбран как конец диапазона)
    const slotIndex = allDaySlots.findIndex(s => s.formattedTime === slotTime);
    if (slotIndex === -1) return false;
    
    // Слот является граничным, если предыдущий слот доступен, а текущий - нет
    if (slotIndex > 0) {
      const prevSlot = allDaySlots[slotIndex - 1].formattedTime;
      return availableTimeSlots.includes(prevSlot) && !availableTimeSlots.includes(slotTime);
    }
    
    return false;
  };

  const getDuration = () => {
    if (!startTime || !endTime || !selectedDate) return null;
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let startDate = new Date(selectedDate);
    let endDate = new Date(selectedDate);
    
    // Используем контекст для определения дня
    const startTimeInNextDay = startTimeContext === 'next';
    const endTimeInNextDay = endTimeContext === 'next';
    
    // Если startTime в следующем дне
    if (startTimeInNextDay) {
      startDate.setDate(startDate.getDate() + 1);
    }
    
    // Если endTime в следующем дне
    if (endTimeInNextDay) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    startDate.setHours(startHour, startMinute, 0, 0);
    endDate.setHours(endHour, endMinute, 0, 0);

    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / 3_600_000;
    
    return durationHours;
  };

  const getDateRange = () => {
    if (!startTime || !endTime || !selectedDate) return '-';
    
    let startDate = new Date(selectedDate);
    let endDate = new Date(selectedDate);
    
    // Используем контекст для определения дня
    const startTimeInNextDay = startTimeContext === 'next';
    const endTimeInNextDay = endTimeContext === 'next';
    
    // Если startTime в следующем дне
    if (startTimeInNextDay) {
      startDate.setDate(startDate.getDate() + 1);
    }
    
    // Если endTime в следующем дне
    if (endTimeInNextDay) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    // Если даты разные - показываем диапазон
    if (startDate.toDateString() !== endDate.toDateString()) {
      return `${formatDate(startDate)} — ${formatDate(endDate)}`;
    }
    
    return formatDate(startDate);
  };

  const duration = getDuration();

  const timeRange = duration !== null
    ? `${startTime} — ${endTime}`
    : '';

  /** ——————————————————— Booking handlers ——————————————————— */
  const onBook = () => {
    if (!selectedDate || !duration || !selectedPlan || !startTime || !endTime) return;
    const totalPrice = selectedPlan.price * duration;
    
    // В режиме редактирования сразу отправляем PUT запрос без формы
    if (editMode) {
      updateBooking({ notes: currentBookingData?.notes || '' });
      return;
    }
    
    // Если выбраны технические работы и пользователь - администратор, создаем бронирование автоматически
    if (isAdmin && selectedPlan.id === 'tech') {
      createTechnicalWorkBooking();
      return;
    }
    
    // Для всех остальных случаев используем стандартный поток
    setBookingDetails({
      date: selectedDate,
      timeRange,
      duration,
      plan: selectedPlan,
      totalPrice,
    });
    setBookingCompleted(true);
  };

  // Функция для автоматического создания бронирования технических работ
  const createTechnicalWorkBooking = async () => {
    if (!selectedDate || !startTime || !endTime || !selectedPlan) return;

    try {
      console.log('🔧 CalendarPage - Создаем бронирование технических работ автоматически');
      
      // Парсим время
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      // Создаем даты для начала и конца
      let startDate = new Date(selectedDate);
      let endDate = new Date(selectedDate);
      
      // Если startTime из секции "следующего дня"
      if (startTimeContext === 'next') {
        startDate.setDate(startDate.getDate() + 1);
      }
      
      // Если endTime из секции "следующего дня"
      if (endTimeContext === 'next') {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      startDate.setHours(startHour, startMinute, 0, 0);
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // Форматируем даты в ISO строки с московским временем
      const formatToMoscowISO = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
      
      const startISO = formatToMoscowISO(startDate);
      const endISO = formatToMoscowISO(endDate);
      
      // Предустановленные данные для технических работ
      const payload = {
        telegramUserId: "0", // Системный пользователь
        telegramUserName: "@admin",
        clientName: "Администратор",
        clientPhone: "79951551711", // Основной номер сервиса
        clientEmail: "admin@detelcam.ru",
        start: startISO,
        end: endISO,
        service: [{
          serviceName: 'Технические работы',
          price: 0
        }],
        car: {
          brand: "Служебная",
          color: "Серый",
          plate: ""
        },
        notes: 'Технические работы администратора'
      };

      console.log('🚀 CalendarPage - Данные для создания технических работ:', payload);
      
      const response = await api.post('/calendar/booking', payload);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Ошибка при создании бронирования');
      }
      
      console.log('✅ CalendarPage - Технические работы созданы успешно');
      
      // Сбрасываем выбранное время
      setStartTime(null);
      setEndTime(null);
      setStartTimeContext(null);
      setEndTimeContext(null);
      
      // Перезагружаем страницу для обновления календаря
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error: any) {
      console.error('❌ CalendarPage - Ошибка при создании технических работ:', error);
      alert('Ошибка при создании технических работ: ' + error.message);
    }
  };

  // Обработчик завершения бронирования из модального окна (используется только в BookingSuccess)
  const handleBookingComplete = (formData: any) => {
    setBookingCompleted(false);
    
    // Сбрасываем выбранное время
    setStartTime(null);
    setEndTime(null);
    setStartTimeContext(null);
    setEndTimeContext(null);
    
    // Если это режим редактирования - используем PUT запрос
    if (editMode && editBookingId) {
      updateBooking(formData);
    } else {
      // Если мы находимся на странице администратора, перезагружаем страницу
      if (isAdmin) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
      // Если передан внешний колбэк - вызываем его
      if (onSubmit) {
        onSubmit(formData);
      }
    }
  };

  // Функция для обновления бронирования
  const updateBooking = async (formData: any) => {
    if (!editBookingId || !startTime || !endTime || !selectedDate || !selectedPlan) {
      console.error('❌ Не хватает данных для обновления бронирования');
      return;
    }

    try {
      console.log('🔄 CalendarPage - Обновляем бронирование:', editBookingId);

      // Создаем даты
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      let startDate = new Date(selectedDate);
      let endDate = new Date(selectedDate);
      
      // Если startTime в следующем дне
      if (startTimeContext === 'next') {
        startDate.setDate(startDate.getDate() + 1);
      }
      
      // Если endTime в следующем дне
      if (endTimeContext === 'next') {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      startDate.setHours(startHour, startMinute, 0, 0);
      endDate.setHours(endHour, endMinute, 0, 0);

      // Форматируем даты в ISO строки с московским временем
      const formatToMoscowISO = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
      
      const payload = {
        start: formatToMoscowISO(startDate),
        end: formatToMoscowISO(endDate),
        services: [{
          serviceName: selectedPlan.title,
          price: selectedPlan.price
        }],
        notes: formData.notes || ''
      };
      
      console.log('🔄 CalendarPage - Отправляем PUT запрос:', payload);
      
      const response = await api.put(`/calendar/booking/${editBookingId}`, payload);
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Ошибка при обновлении бронирования');
      }
      
      console.log('✅ CalendarPage - Бронирование обновлено успешно');
      
      // Вызываем колбэк успеха
      if (onSubmit) {
        onSubmit(formData);
      }
      
    } catch (error: any) {
      console.error('❌ CalendarPage - Ошибка при обновлении:', error);
      alert('Ошибка при обновлении бронирования: ' + error.message);
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

  const handleRangeSelect = (start: string | null, end: string | null, startContext?: 'current' | 'next', endContext?: 'current' | 'next') => {
    console.log('📅 CalendarPage - handleRangeSelect вызвана:', {
      start: start,
      end: end,
      startContext: startContext,
      endContext: endContext,
      selectedDate: selectedDate,
      selectedDateFormatted: selectedDate ? formatDate(selectedDate) : 'null'
    });
    
    setStartTime(start);
    setEndTime(end);
    setStartTimeContext(startContext || null);
    setEndTimeContext(endContext || null);
  };

  // Обновление сетки дней при смене месяца
  useEffect(() => {
    const daysArray = generateDaysForMonth(currentDate.getFullYear(), currentDate.getMonth());
    setDays(daysArray);
  }, [currentDate]);

  // Функция для загрузки данных редактируемого бронирования
  const loadCurrentBookingData = async (bookingId: number | string) => {
    try {
      console.log('🔄 CalendarPage - Загружаем данные бронирования:', bookingId);
      const response = await api.get(`/calendar/booking/${bookingId}`);
      
      if (!response.data?.success || !response.data?.data) {
        throw new Error('Не удалось загрузить данные бронирования');
      }
      
      const booking = response.data.data;
      setCurrentBookingData(booking);
      
      // Устанавливаем дату бронирования
      const bookingStartDate = new Date(booking.start);
      const bookingEndDate = new Date(booking.end);
      
      // Устанавливаем месяц и дату для календаря
      setCurrentDate(new Date(bookingStartDate.getFullYear(), bookingStartDate.getMonth(), 1));
      setSelectedDate(bookingStartDate);
      
      // Форматируем время
      const startTimeStr = bookingStartDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const endTimeStr = bookingEndDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      // Проверяем, переходит ли бронирование на следующий день
      const isSameDay = bookingStartDate.toDateString() === bookingEndDate.toDateString();
      
      setStartTime(startTimeStr);
      setEndTime(endTimeStr);
      setStartTimeContext('current');
      setEndTimeContext(isSameDay ? 'current' : 'next');
      
      // Создаем массив всех слотов бронирования для предварительного выбора
      const preSelected: string[] = [];
      const currentSlot = new Date(bookingStartDate);
      
      // Включаем все слоты от начала до конца (включая конечный слот)
      while (currentSlot <= bookingEndDate) {
        const slotTime = currentSlot.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        preSelected.push(slotTime);
        currentSlot.setHours(currentSlot.getHours() + 1);
        
        // Защита от бесконечного цикла - если уже добавили конечное время, выходим
        if (slotTime === endTimeStr) break;
      }
      
      setPreSelectedSlots(preSelected);
      console.log('✅ CalendarPage - Предвыбранные слоты:', preSelected);
      
      // Автоматически выбираем план на основе данных бронирования
      if (booking.services && booking.services.length > 0) {
        const service = booking.services[0];
        const matchingPlan = pricingPlans.find(plan => 
          plan.title === service.serviceName || 
          (service.price === 0 && plan.id === 'tech') ||
          (service.price > 0 && plan.id === 'all-inclusive')
        );
        
        if (matchingPlan) {
          handlePlanClick(matchingPlan);
          console.log('✅ CalendarPage - Автоматически выбран план:', matchingPlan.title);
        }
      }
      
      console.log('✅ CalendarPage - Данные бронирования загружены:', {
        start: startTimeStr,
        end: endTimeStr,
        date: bookingStartDate.toDateString(),
        isSameDay,
        service: booking.services?.[0]?.serviceName,
        preSelectedSlots: preSelected
      });
      
      return booking;
    } catch (error) {
      console.error('❌ CalendarPage - Ошибка загрузки данных бронирования:', error);
      throw error;
    }
  };

  /** ——————————————————— Init ——————————————————— */
  useEffect(() => {
    if (isInitialized) return;

    const init = async () => {
      let targetDate = new Date();
      
      // Если это режим редактирования, загружаем данные бронирования
      if (editMode && editBookingId) {
        try {
          const booking = await loadCurrentBookingData(editBookingId);
          targetDate = new Date(booking.start);
        } catch (error) {
          console.error('Ошибка загрузки данных бронирования:', error);
        }
      } else if (externalSelectedDate) {
        targetDate = externalSelectedDate;
      }

      const daysArray = generateDaysForMonth(targetDate.getFullYear(), targetDate.getMonth());
      setDays(daysArray);

      let initialDay: Day | undefined;
      if (editMode && editBookingId) {
        // В режиме редактирования устанавливаем дату бронирования
        initialDay = daysArray.find(d => d.date.toDateString() === targetDate.toDateString());
      } else if (externalSelectedDate) {
        initialDay = daysArray.find(d => d.date.toDateString() === externalSelectedDate.toDateString());
      } else {
        initialDay = daysArray.find(d => d.isToday && d.isAvailable);
      }
      
      setIsInitialized(true);

      if (!initialDay) {
        setLoadingSlots(false);
        return;
      }

      if (!selectedDate) {
        setSelectedDate(initialDay.date);
      }
      
      setLoadingSlots(true);
      try {
        const { formattedTimeSlots, timeSlotsWithData } = await fetchAvailableTimeSlots(initialDay.date, excludeBookingId);
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

  return (
    <div className={isAdmin ? `${styles.calendarContainer} ${styles.admin}` : styles.calendarContainer}>
      {/* ——— header ——— */}
      {!bookingCompleted && (
        <div className={styles.calendarHeader}>
          <h1 className={styles.title}>
            {editMode ? `Изменить бронирование #${editBookingId}` : 'Выберите дату и время'}
          </h1>
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
              nextDayTimeSlots={nextDayTimeSlots}
              formatDate={formatDate}
              timeSlotData={timeSlotData}
              nextDayTimeSlotData={nextDayTimeSlotData}
              onRangeSelect={handleRangeSelect}
              startTime={startTime}
              endTime={endTime}
              startTimeContext={startTimeContext}
              endTimeContext={endTimeContext}
              preSelectedSlots={preSelectedSlots}
              editMode={editMode}
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
                    startTime={startTime}
                    endTime={endTime}
                    duration={duration}
                    selectedPlan={selectedPlan}
                    onBook={onBook}
                    formatDate={formatDate}
                    getDateRange={getDateRange}
                    editMode={editMode}
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
            getDateRange={getDateRange}
            goToProducts={goToProducts}
            addBookingToCart={addBookingToCart}
            onBack={() => setBookingCompleted(false)}
          />
        )
      )}
      
      {/* Модальное окно больше не нужно для технических работ - они создаются автоматически */}
    </div>
  );
};

export default CalendarPage;