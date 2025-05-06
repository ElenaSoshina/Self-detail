import React, { useState, useEffect } from 'react';
import styles from './CalendarPage.module.css';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContex';
import { v4 as uuidv4 } from 'uuid'; // Для генерации уникальных ID
import axios from 'axios';

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

// Интерфейс для слота времени с дополнительными данными
interface TimeSlotWithData {
  formattedTime: string;
  originalData: any;
  sortKey: number;
  start: Date;  // Время начала слота
  end: Date;    // Время окончания слота
}

// Для работы с доступными слотами
interface AvailabilityData {
  timeSlots: string[];              // Форматированные слоты для отображения
  originalData: TimeSlotWithData[]; // Оригинальные данные для вычислений
  maxAvailableHours: number;        // Максимальное кол-во часов для выбранного слота
}

const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotWithData[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [maxAvailableHours, setMaxAvailableHours] = useState<number>(8); // Максимально возможная продолжительность
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [hours, setHours] = useState<number>(1);
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
    }
  ];

  // Массив названий месяцев
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Массив названий дней недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Запрос доступных слотов с сервера
  const fetchAvailableTimeSlots = async (date: Date) => {
    try {
      console.log('Запрос слотов для даты:', date);
      setLoadingSlots(true);
      setSlotsError(null);
      
      // Создаем начальную и конечную даты (сутки)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      // Форматируем даты для запроса в ISO формате
      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();
      
      // Выводим URL запроса для отладки
      const apiUrl = 'https://backend.self-detailing.duckdns.org/api/v1/calendar/available';
      console.log('URL запроса:', apiUrl);
      console.log('Параметры запроса:', { start: startDateISO, end: endDateISO });

      // Выполняем запрос к API с использованием axios
      const response = await axios.get(
        apiUrl, 
        {
          params: {
            start: startDateISO,
            end: endDateISO
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000, // 10 секунд таймаут
        }
      );
      
      // Обрабатываем данные из ответа
      console.log('Статус ответа:', response.status);
      console.log('Данные ответа:', response.data);
      
      const data = response.data;
      
      // Форматируем полученные слоты в нужный формат и сохраняем исходные данные
      const timeSlotsWithData: TimeSlotWithData[] = data.map((slot: any) => {
        const slotTime = new Date(slot.start);
        const hours = slotTime.getHours();
        const minutes = slotTime.getMinutes();
        
        // Проверяем наличие длительности в данных слота
        const duration = slot.duration || 60; // По умолчанию 60 минут, если не указано
        
        // Создаем объект с отформатированным временем и оригинальными данными
        return {
          formattedTime: `${hours < 10 ? '0' + hours : hours}:${minutes === 0 ? '00' : minutes < 10 ? '0' + minutes : minutes}`,
          originalData: slot,
          sortKey: hours * 60 + minutes, // Ключ для сортировки (минуты от начала дня)
          start: slotTime,
          end: new Date(slotTime.getTime() + duration * 60000) // Время окончания слота
        };
      });
      
      // Выводим полные данные о слотах для отладки
      console.log('Данные слотов перед сортировкой:', timeSlotsWithData);
      
      // Сортируем слоты по времени
      timeSlotsWithData.sort((a: TimeSlotWithData, b: TimeSlotWithData) => a.sortKey - b.sortKey);
      
      console.log('Отсортированные данные слотов:', timeSlotsWithData);
      
      // Извлекаем только форматированное время для отображения
      const formattedTimeSlots = timeSlotsWithData.map((slot: TimeSlotWithData) => slot.formattedTime);
      
      console.log('Форматированные временные слоты для отображения:', formattedTimeSlots);
      
      setAvailableTimeSlots(formattedTimeSlots);
      setTimeSlotData(timeSlotsWithData);
      setLoadingSlots(false);
      
      // Если есть выбранное время, пересчитываем доступное количество часов
      if (selectedTime) {
        const maxHours = calculateMaxAvailableHours(selectedTime, timeSlotsWithData);
        setMaxAvailableHours(maxHours);
        
        // Корректируем выбранное количество часов, если оно превышает максимум
        if (hours > maxHours) {
          setHours(maxHours);
        }
      }
    } catch (error: any) {
      console.error('Ошибка при получении доступных слотов:', error);
      
      // Выводим подробную информацию об ошибке
      if (axios.isAxiosError(error)) {
        console.log('Ошибка Axios:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params,
            headers: error.config?.headers,
            timeout: error.config?.timeout,
          }
        });
        
        if (error.response) {
          // Получен ответ от сервера, но с ошибкой
          setSlotsError(`Ошибка сервера: ${error.response.status} ${error.response.statusText}. Подробности в консоли.`);
        } else if (error.request) {
          // Запрос был сделан, но ответ не получен
          setSlotsError(`Сервер не отвечает. Возможно проблемы с подключением или CORS.`);
        } else {
          // Что-то пошло не так при настройке запроса
          setSlotsError(`Ошибка запроса: ${error.message}`);
        }
      } else {
        // Обычная ошибка, не связанная с Axios
        setSlotsError(`Неизвестная ошибка: ${error.message}`);
      }
      
      setAvailableTimeSlots([]);
      setTimeSlotData([]);
      setLoadingSlots(false);
    }
  };

  // Простая инициализация при монтировании - выбираем текущий день
  useEffect(() => {
    console.log('Компонент смонтирован, выбираем текущий день');
    
    // Генерируем дни для текущего месяца
    const daysArray = generateDaysForMonth(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );
    setDays(daysArray);
    
    // Находим текущий день и выбираем его, если он доступен
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Сбрасываем время для корректного сравнения
    
    console.log('Поиск текущего дня в массиве дней...');
    const todayDay = daysArray.find(day => 
      day.isToday && day.isAvailable
    );
    
    if (todayDay) {
      console.log('Текущий день найден и доступен:', todayDay.date);
      setSelectedDate(todayDay.date);
      
      // Принудительно запрашиваем слоты для текущего дня с небольшой задержкой
      setTimeout(() => {
        console.log('Запускаем принудительную загрузку слотов для сегодня');
        try {
          // Для запроса нужно использовать полночь сегодняшнего дня и 23:59:59 сегодняшнего дня
          const todayStart = new Date(today);
          todayStart.setHours(0, 0, 0, 0);
          
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          
          // Форматируем даты для запроса в ISO формате
          const startDateISO = todayStart.toISOString();
          const endDateISO = todayEnd.toISOString();
          
          console.log('Прямой запрос к API для текущей даты:', {
            сегодня: today,
            начало: startDateISO,
            конец: endDateISO
          });
          
          // Выполняем запрос напрямую
          axios.get(
            'https://backend.self-detailing.duckdns.org/api/v1/calendar/available',
            {
              params: {
                start: startDateISO,
                end: endDateISO
              },
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          )
          .then(response => {
            console.log('Успешный ответ от сервера для сегодня:', response.data);
            console.log('Длина массива слотов:', response.data.length);
            
            // Форматируем и сохраняем полученные слоты
            const data = response.data;
            const timeSlotsWithData: TimeSlotWithData[] = data.map((slot: any) => {
              const slotTime = new Date(slot.start);
              const hours = slotTime.getHours();
              const minutes = slotTime.getMinutes();
              return {
                formattedTime: `${hours < 10 ? '0' + hours : hours}:${minutes === 0 ? '00' : minutes < 10 ? '0' + minutes : minutes}`,
                originalData: slot,
                sortKey: hours * 60 + minutes,
                start: slotTime,
                end: new Date(slotTime.getTime() + slot.duration * 60000)
              };
            });
            
            timeSlotsWithData.sort((a: TimeSlotWithData, b: TimeSlotWithData) => a.sortKey - b.sortKey);
            const formattedTimeSlots = timeSlotsWithData.map((slot: TimeSlotWithData) => slot.formattedTime);
            
            console.log('Отформатированные слоты:', formattedTimeSlots);
            setAvailableTimeSlots(formattedTimeSlots);
            setTimeSlotData(timeSlotsWithData);
          })
          .catch(error => {
            console.error('Ошибка при загрузке слотов для сегодня:', error);
            if (axios.isAxiosError(error)) {
              console.log('Детали ошибки Axios:', {
                сообщение: error.message,
                статус: error.response?.status,
                данные: error.response?.data,
                параметры: error.config?.params,
                URL: error.config?.url
              });
            }
            setSlotsError('Ошибка загрузки слотов. Подробности в консоли.');
            setAvailableTimeSlots([]);
            setTimeSlotData([]);
          });
        } catch (e) {
          console.error('Произошла ошибка при прямом вызове:', e);
          setLoadingSlots(false);
        }
      }, 500);
    } else {
      console.log('Текущий день недоступен или не найден');
      setLoadingSlots(false);
    }
  }, []); // Пустой массив зависимостей - только при монтировании
  
  // Обновление дней при изменении текущего месяца
  useEffect(() => {
    // Пропускаем первый рендер, чтобы не перезаписать результаты инициализации
    if (days.length > 0) {
      console.log('Обновление месяца:', currentDate);
      const daysArray = generateDaysForMonth(
        currentDate.getFullYear(),
        currentDate.getMonth()
      );
      setDays(daysArray);
    }
  }, [currentDate, days.length]);

  // Генерация временных слотов при явном выборе даты (не при инициализации)
  useEffect(() => {
    // Пропускаем первый рендер
    if (selectedDate && days.length > 0) {
      console.log('Дата выбрана вручную:', selectedDate);
      fetchAvailableTimeSlots(selectedDate);
      
      setSelectedTime(null);
      setSelectedPlan(null);
      setBookingDetails(null);
      setBookingCompleted(false);
    }
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
    // Сбрасываем время для корректного сравнения дат
    today.setHours(0, 0, 0, 0);
    
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      // Для корректного сравнения сбрасываем время
      date.setHours(0, 0, 0, 0);
      
      // Считаем сегодняшний день и все будущие доступными для выбора
      const isDateAvailable = date >= today;
      
      // Для отладки
      if (isSameDay(date, today)) {
        console.log('Текущий день доступен:', isDateAvailable);
      }
      
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
        isToday: isSameDay(date, new Date()),
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
      // Печатаем информацию о выбранной дате
      console.log('Выбрана дата:', day.date);
      console.log('Это сегодня:', day.isToday);
      
      // Устанавливаем выбранную дату
      setSelectedDate(day.date);
      
      // Если выбрана сегодняшняя дата, выполняем прямой запрос для нее
      if (day.isToday) {
        console.log('Выбран текущий день, выполняем прямой запрос для сегодня');
        
        // Получаем сегодняшнюю дату
        const today = new Date();
        
        // Устанавливаем диапазон времени для запроса (весь день)
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        // Форматируем даты для запроса
        const startDateISO = todayStart.toISOString();
        const endDateISO = todayEnd.toISOString();
        
        console.log('Запрос на слоты для сегодняшнего дня:', {
          начало: startDateISO,
          конец: endDateISO
        });
        
        // Показываем индикатор загрузки
        setLoadingSlots(true);
        setSlotsError(null);
        
        // Выполняем запрос к API
        axios.get(
          'https://backend.self-detailing.duckdns.org/api/v1/calendar/available',
          {
            params: {
              start: startDateISO,
              end: endDateISO
            },
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        )
        .then(response => {
          console.log('Получены слоты для сегодня:', response.data);
          
          // Обрабатываем данные и сохраняем слоты
          const data = response.data;
          if (data && Array.isArray(data)) {
            // Обрабатываем и форматируем данные
            const timeSlotsWithData: TimeSlotWithData[] = data.map((slot: any) => {
              const slotTime = new Date(slot.start);
              const hours = slotTime.getHours();
              const minutes = slotTime.getMinutes();
              return {
                formattedTime: `${hours < 10 ? '0' + hours : hours}:${minutes === 0 ? '00' : minutes < 10 ? '0' + minutes : minutes}`,
                originalData: slot,
                sortKey: hours * 60 + minutes,
                start: slotTime,
                end: new Date(slotTime.getTime() + slot.duration * 60000)
              };
            });
            
            timeSlotsWithData.sort((a: TimeSlotWithData, b: TimeSlotWithData) => a.sortKey - b.sortKey);
            const formattedTimeSlots = timeSlotsWithData.map((slot: TimeSlotWithData) => slot.formattedTime);
            
            console.log('Обработанные слоты для отображения:', formattedTimeSlots);
            setAvailableTimeSlots(formattedTimeSlots);
            setTimeSlotData(timeSlotsWithData);
          } else {
            console.error('Неверный формат данных от сервера:', data);
            setAvailableTimeSlots([]);
            setTimeSlotData([]);
          }
          
          setLoadingSlots(false);
        })
        .catch(error => {
          console.error('Ошибка при загрузке слотов для текущего дня:', error);
          setSlotsError('Не удалось загрузить слоты для текущего дня');
          setAvailableTimeSlots([]);
          setTimeSlotData([]);
          setLoadingSlots(false);
        });
      }
    }
  };

  // Обработчик выбора времени
  const handleTimeSlotClick = (timeSlot: string) => {
    setSelectedTime(timeSlot);
    
    // Вычисляем максимальную продолжительность для выбранного слота
    const maxHours = calculateMaxAvailableHours(timeSlot, timeSlotData);
    setMaxAvailableHours(maxHours);
    
    // Сбрасываем значение часов на 1, если текущее значение превышает максимум
    if (hours > maxHours) {
      setHours(1);
    }
    
    console.log(`Для слота ${timeSlot} доступно максимум ${maxHours} ч.`);
  };

  // Обработчик выбора тарифа
  const handlePlanClick = (plan: PricingPlan) => {
    setSelectedPlan(plan);
  };

  // Обработчик изменения количества часов
  const handleHoursChange = (newHours: number) => {
    // Ограничиваем от 1 до максимально доступного количества часов
    setHours(Math.max(1, Math.min(newHours, maxAvailableHours)));
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

  // Функция для вычисления максимальной доступной продолжительности брони
  const calculateMaxAvailableHours = (selectedTimeStr: string, slots: TimeSlotWithData[]): number => {
    console.log('Вычисление максимальной продолжительности для', selectedTimeStr);
    console.log('Доступные слоты:', slots.map(s => s.formattedTime));
    
    // Находим индекс выбранного слота
    const selectedIndex = slots.findIndex(slot => slot.formattedTime === selectedTimeStr);
    
    if (selectedIndex === -1) {
      console.log('Выбранный слот не найден в массиве');
      return 1; // Если слот не найден, по умолчанию 1 час
    }
    
    const selectedSlot = slots[selectedIndex];
    const selectedStartTime = new Date(selectedSlot.start);
    
    console.log('Время начала выбранного слота:', selectedStartTime);
    
    // Находим все слоты, которые идут последовательно
    let availableHours = 1; // Начинаем с 1 часа (выбранный слот)
    
    // Формируем массив из последовательных часов
    let hourSlots = [selectedSlot];
    
    // Получаем ожидаемое время начала следующего часового слота
    let nextHourExpected = new Date(selectedStartTime);
    nextHourExpected.setHours(nextHourExpected.getHours() + 1);
    
    // Отсортируем слоты по времени
    const sortedSlots = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Проходим по всем слотам после выбранного
    for (let i = 0; i < sortedSlots.length; i++) {
      const slot = sortedSlots[i];
      
      // Пропускаем слоты, которые начинаются раньше или одновременно с выбранным
      if (slot.start <= selectedStartTime) continue;
      
      const slotStartTime = new Date(slot.start);
      
      // Вычисляем разницу между ожидаемым и фактическим временем начала слота (в минутах)
      const diffMinutes = Math.abs(
        (slotStartTime.getTime() - nextHourExpected.getTime()) / (60 * 1000)
      );
      
      // Если разница меньше 5 минут, считаем этот слот следующим по порядку
      if (diffMinutes < 5) {
        availableHours++;
        hourSlots.push(slot);
        
        // Обновляем ожидаемое время для следующего часа
        nextHourExpected = new Date(slotStartTime);
        nextHourExpected.setHours(nextHourExpected.getHours() + 1);
        
        // Ограничиваем максимум 8 часами
        if (availableHours >= 8) break;
      }
    }
    
    console.log('Найдено последовательных часов:', availableHours);
    console.log('Последовательные слоты:', hourSlots.map(s => s.formattedTime));
    
    return Math.min(availableHours, 8);
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
                    ${day.isAvailable ? styles.available : styles.unavailable}
                    ${day.isToday ? styles.today : ''}
                    ${selectedDate && isSameDay(day.date, selectedDate) ? styles.selected : ''}
                  `}
                  onClick={() => handleDateClick(day)}
                >
                  {day.date.getDate()}
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
                  
                  {loadingSlots ? (
                    <div className={styles.loadingMessage}>
                      Загрузка доступных слотов...
                    </div>
                  ) : slotsError ? (
                    <div className={styles.errorMessage}>
                      {slotsError}
                    </div>
                  ) : availableTimeSlots.length > 0 ? (
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
                <div className={styles.loadingMessage}>
                  Загрузка свободных слотов...
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
                    disabled={hours >= maxAvailableHours}
                  >
                    +
                  </button>
                </div>
                
                {maxAvailableHours < 8 && (
                  <div className={styles.availabilityInfo}>
                    В выбранное время бронирование возможно только на {maxAvailableHours} {maxAvailableHours === 1 ? 'час' : maxAvailableHours < 5 ? 'часа' : 'часов'}
                  </div>
                )}
                
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