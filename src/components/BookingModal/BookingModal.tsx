import React, { useState, useEffect, useMemo } from 'react';
import styles from './BookingModal.module.css';
import SuccessPopup from '../SuccessPopup/SuccessPopup';
import {
  sendTelegramMessage,
  sendTelegramMessageByUsername,
  formatUserMessage,
  formatAdminMessage,
  sendTelegramMessageToAllAdmins
} from '../../api/telegram';
import PhoneInput from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';
import { useCart } from '../../context/CartContex';
import api from '../../api/apiService';
import CalendarConfirmModal from '../CalendarConfirmModal/CalendarConfirmModal';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: string;
  endTime: string;
  duration?: number;
  service?: {
    serviceName: string;
    price: number;
  } | null;
  onSubmit: (formData: any) => void;
  selectedDate: Date | null;
  isAdmin?: boolean;
  prefilledData?: {
    name: string;
    phone: string;
    email: string;
    telegramUserName: string;
  };
  startTimeContext?: 'current' | 'next' | null;
  endTimeContext?: 'current' | 'next' | null;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  telegramUserName: string;
}

// Интерфейс для данных пользователя
interface UserData {
  id: number;
  telegramUserId: number;
  telegramUserName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  createdAt: string;
}

// Функция для проверки существования пользователя по telegramUserId
const checkUserExists = async (telegramUserId: number): Promise<boolean> => {
  try {
    const response = await api.get('/users');
    const data = response.data;
    
    if (data.success && data.data && data.data.content) {
      return data.data.content.some((user: UserData) => user.telegramUserId === telegramUserId);
    }
    return false;
  } catch (error) {
    console.error('Ошибка при проверке существования пользователя:', error);
    return false;
  }
};

// Функция для получения данных пользователя по telegramUserId
const getUserData = async (telegramUserId: number): Promise<UserData | null> => {
  try {
    const response = await api.get(`/users/${telegramUserId}`);
    const data = response.data;
    
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return null;
  }
};

// Функция для сохранения данных пользователя
const saveUserData = async (userData: {
  telegramUserId: number;
  telegramUserName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
}): Promise<boolean> => {
  try {
    console.log('💾 Сохраняем данные пользователя:', userData);
    const response = await api.post('/users', userData);
    const data = response.data;
    
    if (data.success) {
      console.log('✅ Данные пользователя сохранены успешно');
      return true;
    } else {
      console.warn('⚠️ Не удалось сохранить данные пользователя:', data.errorMessage);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при сохранении данных пользователя:', error);
    return false;
  }
};

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  startTime,
  endTime,
  duration,
  service,
  onSubmit,
  selectedDate,
  isAdmin,
  prefilledData,
  startTimeContext,
  endTimeContext
}) => {
  console.log('📄 BookingModal - Получены props:', {
    isOpen: isOpen,
    startTime: startTime,
    endTime: endTime,
    duration: duration,
    service: service,
    selectedDate: selectedDate,
    selectedDateFormatted: selectedDate ? selectedDate.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }) : 'null',
    isAdmin: isAdmin
  });
  
  const [formData, setFormData] = useState<FormData>({
    name: prefilledData?.name || '',
    phone: prefilledData?.phone || '',
    email: prefilledData?.email || '',
    telegramUserName: prefilledData?.telegramUserName || '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; email?: string; telegramUserName?: string }>({});
  const { items } = useCart();
  const products = items.filter(item => item.type !== 'booking');
  const productsTotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  
  // Состояние для работы с модальным окном подтверждения добавления в календарь
  const [bookingId, setBookingId] = useState<number | null>(null);
    const [eventDetails, setEventDetails] = useState<{
    title: string;
    description: string;
    location: string;
    start: Date;
    end: Date;
  } | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  
  // Нормализуем отображение времени
  const [displayTime, setDisplayTime] = useState('');

  // Получаем chatId пользователя из Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      const userId = tg.initDataUnsafe.user.id.toString();
      setChatId(userId);
      tg.ready?.();
    }
  }, []);

  // Автозаполнение формы данными пользователя
  useEffect(() => {
    const loadUserData = async () => {
      // Если форма уже заполнена через prefilledData, не перезаписываем
      if (prefilledData && (prefilledData.name || prefilledData.phone || prefilledData.email)) {
        return;
      }

      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user?.id && isOpen) {
        const telegramUserId = tg.initDataUnsafe.user.id;
        
        try {
          console.log('🔍 Проверяем существование пользователя:', telegramUserId);
          const userExists = await checkUserExists(telegramUserId);
          
          if (userExists) {
            console.log('✅ Пользователь найден, загружаем данные...');
            const userData = await getUserData(telegramUserId);
            
            if (userData) {
              console.log('📋 Автозаполнение формы данными:', userData);
              
              // Форматируем номер телефона для валидации
              let formattedPhone = userData.clientPhone || '';
              if (formattedPhone && !formattedPhone.startsWith('+7')) {
                // Если номер не начинается с +7, добавляем его
                if (formattedPhone.startsWith('7')) {
                  formattedPhone = '+' + formattedPhone;
                } else if (formattedPhone.startsWith('8')) {
                  formattedPhone = '+7' + formattedPhone.substring(1);
                } else {
                  formattedPhone = '+7' + formattedPhone;
                }
              }
              
              setFormData({
                name: userData.clientName || '',
                phone: formattedPhone,
                email: userData.clientEmail || '',
                telegramUserName: userData.telegramUserName || '',
              });
            }
          } else {
            console.log('ℹ️ Пользователь не найден, форма остается пустой');
          }
        } catch (error) {
          console.error('❌ Ошибка при загрузке данных пользователя:', error);
        }
      }
    };

    loadUserData();
  }, [isOpen, prefilledData]);

  // Корректная обработка даты в useEffect без зависимости от selectedDate
  useEffect(() => {
    // Нормализуем время для отображения
    if (startTime) {
      // Ищем все числа формата ЧЧ:ММ
      const timeMatches = startTime.match(/\d{1,2}:\d{2}/g);
      if (timeMatches && timeMatches.length >= 2) {
        // Если в startTime найдены два времени, используем их
        setDisplayTime(`${timeMatches[0]} - ${timeMatches[1]}`);
      } else if (startTime && endTime) {
        // Если есть отдельные startTime и endTime
        setDisplayTime(`${startTime} - ${endTime}`);
      } else {
        // Если найдено только одно время в startTime
        setDisplayTime(startTime);
      }
    }
  }, [startTime, endTime]);

  // Соответствие serviceName <-> serviceRu
  const serviceNameMap: { [key: string]: string } = {
    'Все включено': 'Все включено',
    'Технические работы': 'Технические работы'
  };

  // Вычисление количества часов бронирования
  const durationHours = useMemo(() => {
    // Если передана готовая продолжительность из родительского компонента - используем её
    if (duration !== undefined) {
      return duration;
    }
    
    // Fallback для случаев когда duration не передан (например, при вызове из корзины)
    try {
      let start, end;
      
      // Проверяем, содержит ли startTime диапазон
      if (startTime.includes('—') || startTime.includes('-')) {
        const parts = startTime.split(/[—-]/).map(s => s.trim());
        start = parts[0];
        end = parts[1];
      } else {
        start = startTime;
        end = endTime;
      }
      
      if (!start || !end) {
        return 1;
      }
      
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      
      let hours = endH - startH;
      
      // Если время окончания меньше времени начала, значит переход через день
      if (endH < startH || (endH === startH && endM < startM)) {
        hours = (24 - startH) + endH;
      }
      
      // Учитываем минуты
      if (endM > startM) hours += 1;
      
      return hours > 0 ? hours : 1;
    } catch (error) {
      console.error('Error in duration calculation:', error);
      return 1;
    }
  }, [startTime, endTime, duration]);

  const getDurationHours = () => {
    return durationHours;
  };
  
  // Проверяем источник данных
  const checkSource = () => {
    if (startTime.includes(' - ') || startTime.includes(' — ')) {
      // Если время имеет формат с разделителем, значит оно пришло из BookingSuccess
      return 'BookingSuccess';
    }
    return 'Other';
  };
  const dataSource = checkSource();
  
  // Упрощенные переменные для отображения
  const hasService = Boolean(service && service.serviceName && service.serviceName !== '');
  const baseServicePrice = service?.price ?? 0; // Базовая стоимость из props
  
  // Проверка: данные из корзины или из календаря
  const isFromCart = Boolean(window.location.href.includes('/cart'));
  
  // Определяем итоговую стоимость услуги
  // Если пришли из корзины, цена уже включает длительность
  // Если не из корзины, нужно умножить на длительность
  const servicePrice = isFromCart ? baseServicePrice : baseServicePrice * getDurationHours();
  
  const serviceRu = hasService && service?.serviceName ? (serviceNameMap[service.serviceName] || service.serviceName) : '';
  
  // Общая стоимость: услуга + товары
  const totalPrice = (hasService ? servicePrice : 0) + productsTotal;

  const validate = (): boolean => {
    const newErrors: { name?: string; phone?: string; email?: string; telegramUserName?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя';
    }
    const phone = formData.phone.replace(/\u00A0/g, ' ');
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'Введите номер телефона';
    } else if (!phone.startsWith('+7')) {
      newErrors.phone = 'Номер должен начинаться с +7';
    } else if (phoneDigits.length !== 11) {
      newErrors.phone = 'Номер должен содержать 11 цифр';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    }
    if (!formData.telegramUserName.trim()) {
      newErrors.telegramUserName = 'Введите ваш username в Telegram';
    } else if (!formData.telegramUserName.trim().startsWith('@')) {
      newErrors.telegramUserName = 'Username должен начинаться с @';
    } else if (formData.telegramUserName.trim() === '@') {
      newErrors.telegramUserName = 'Введите имя пользователя после @';
    }
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 BookingModal - Начало handleSubmit');
    
    if (!validate()) {
      console.log('❌ BookingModal - Валидация не прошла, ошибки:', fieldErrors);
      return;
    }
    
    console.log('✅ BookingModal - Валидация прошла успешно');
    
    setIsLoading(true);
    setError(null);
    console.log('🔄 BookingModal - Начинаем обработку данных');
    
    try {
      console.log('🔄 BookingModal - Парсим время:', { startTime, endTime });
      
      // подготовить дату
      let startTimeStr = startTime;
      let endTimeStr = endTime;
      
      // Если startTime содержит диапазон времени (например, "17:00 — 01:00")
      if (startTime.includes('—') || startTime.includes('-')) {
        const times = startTime.match(/\d{1,2}:\d{2}/g);
        if (times && times.length >= 2) {
          startTimeStr = times[0];
          endTimeStr = times[1];
        }
      }
      
      console.log('🔄 BookingModal - Обработанное время:', { startTimeStr, endTimeStr });
      
      const date = selectedDate || new Date();
      console.log('🔄 BookingModal - Выбранная дата:', date);
      
      // Создаем даты для начала и конца с учетом контекста
      let startDate = new Date(date);
      let endDate = new Date(date);
      
      // Если startTime из секции "следующего дня"
      if (startTimeContext === 'next') {
        startDate.setDate(startDate.getDate() + 1);
      }
      
      // Если endTime из секции "следующего дня"
      if (endTimeContext === 'next') {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      // Fallback логика для случаев когда контекст не передан (например, из корзины)
      if (!startTimeContext && !endTimeContext) {
        // Парсим время для определения межсуточного перехода
        let start, end;
        
        if (startTime.includes('—') || startTime.includes('-')) {
          const parts = startTime.split(/[—-]/).map(s => s.trim());
          start = parts[0];
          end = parts[1];
        } else {
          start = startTime;
          end = endTime;
        }
        
        if (start && end) {
          const [startH] = start.split(':').map(Number);
          const [endH] = end.split(':').map(Number);
          
          // Если время окончания меньше времени начала, значит переход на следующий день
          if (endH < startH) {
            endDate.setDate(endDate.getDate() + 1);
          }
        }
      }
      
      console.log('🔄 BookingModal - Фактические даты с учетом контекста:', {
        originalDate: date,
        startDate: startDate,
        endDate: endDate,
        startTimeContext: startTimeContext,
        endTimeContext: endTimeContext,
        usedFallbackLogic: !startTimeContext && !endTimeContext
      });
      
      // Парсим время
      const [startHour, startMinute] = startTimeStr.split(':').map(Number);
      const [endHour, endMinute] = endTimeStr.split(':').map(Number);
      
      console.log('🔄 BookingModal - Парсинг времени:', { startHour, startMinute, endHour, endMinute });
      
      startDate.setHours(startHour, startMinute, 0, 0);
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // ИСПРАВЛЕНО: Создаем ISO строки с московским временем, а не UTC
      const formatToMoscowISO = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        // Возвращаем строку в формате ISO но с московским временем
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
      
      const startISO = formatToMoscowISO(startDate);
      const endISO = formatToMoscowISO(endDate);
      
      console.log('🔄 BookingModal - ISO даты:', { startISO, endISO });

      const payload = {
        telegramUserId: chatId || "0",
        telegramUserName: formData.telegramUserName,
        clientName: formData.name,
        clientPhone: formData.phone.replace('+',''),
        clientEmail: formData.email,
        start: startISO,
        end: endISO,
        service: hasService ? [{ serviceName: service!.serviceName, price: servicePrice }] : [],
        notes: ''
      };

      console.log('🚀 BookingModal - Данные для отправки на сервер:', payload);

      console.log('🔄 BookingModal - Отправляем запрос на сервер...');
      const res = await api.post('/calendar/booking', payload);
      
      const id = res.data?.data?.bookingId;
      if (!id) throw new Error('bookingId не вернулся');
      
      setBookingId(id);

      // собираем детали события
      setEventDetails({
        title: `Бронирование: ${service?.serviceName ?? ''}`,
        description: `Услуги: ${service?.serviceName ?? ''}\nКонтакт: ${formData.name}, тел: ${formData.phone}`,
        location: 'Self-Detailing Location',
        start: new Date(startISO),
        end: new Date(endISO),
      });
      
      // открываем наше модальное окно
      setShowCalendarModal(true);
      
      const adminMsg = formatAdminMessage(payload, { price: servicePrice }, service?.serviceName ?? '');
      const userMsg  = formatUserMessage(payload, { price: servicePrice }, service?.serviceName ?? '');
      
      console.log('📲 BookingModal - Данные для отправки в Telegram:', {
        payload: payload,
        servicePrice: servicePrice,
        serviceName: service?.serviceName ?? '',
        adminMsg: adminMsg,
        userMsg: userMsg,
        isAdmin: isAdmin,
        chatId: chatId,
        timestamp: new Date().toISOString()
      });
      
      console.log('📤 BookingModal - Начинаем отправку уведомлений...');
      
      try {
        if (isAdmin) {
          console.log('👤 Режим администратора - отправляем только админам');
          await sendTelegramMessageToAllAdmins(adminMsg);
        } else {
          console.log('👥 Режим пользователя - отправляем пользователю и админам');
          if (chatId) {
            console.log('📱 Отправляем сообщение пользователю в чат:', chatId);
            await sendTelegramMessage(chatId, userMsg);
          } else {
            console.log('⚠️ ChatId пользователя не найден, пропускаем отправку пользователю');
          }
          console.log('📢 Отправляем уведомление администраторам');
          await sendTelegramMessageToAllAdmins(adminMsg);
        }
        
        console.log('✅ Все уведомления отправлены успешно');
      } catch (telegramError: any) {
        console.error('❌ Ошибка при отправке Telegram уведомлений:', {
          error: telegramError.message,
          stack: telegramError.stack,
          isAdmin: isAdmin,
          chatId: chatId
        });
        // Не прерываем выполнение из-за ошибок Telegram, но логируем их
        console.warn('⚠️ Бронирование создано, но возникла проблема с уведомлениями');
      }

      // Сохраняем данные пользователя для будущих бронирований
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user?.id) {
          const telegramUserId = tg.initDataUnsafe.user.id;
          
          // Проверяем, нужно ли создавать или обновлять данные пользователя
          const userExists = await checkUserExists(telegramUserId);
          
          if (!userExists) {
            // Пользователь не существует, создаем новую запись
            const userDataToSave = {
              telegramUserId: telegramUserId,
              telegramUserName: formData.telegramUserName,
              clientName: formData.name,
              clientPhone: formData.phone.replace('+', ''),
              clientEmail: formData.email
            };
            
            await saveUserData(userDataToSave);
          } else {
            console.log('ℹ️ Пользователь уже существует, пропускаем сохранение');
          }
        }
      } catch (userSaveError) {
        console.error('❌ Ошибка при сохранении данных пользователя:', userSaveError);
        // Не прерываем выполнение, так как основное бронирование создано
      }

    } catch (err: any) {
      setError(err.message || 'Ошибка бронирования');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Авто-добавление @ для Telegram
    if (name === 'telegramUserName' && value && !value.startsWith('@') && value !== '@') {
      setFormData(prev => ({ ...prev, [name]: `@${value}` }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length > 11) return;
    setFormData(prev => ({ ...prev, phone: value || '' }));
    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
  };
  
  // Обработчик добавления в календарь
  const handleAddToCalendar = async () => {
    if (!bookingId) {
      return;
    }
    
    setIsCalendarLoading(true);
    
    // Показываем сообщение об успешном бронировании
    setTimeout(() => {
      // Обработка успешного добавления
      if (onSubmit) {
        const submittedData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          telegramUserName: formData.telegramUserName,
          selectedDate: selectedDate || new Date(),
          startTime: startTime, 
          endTime: endTime,
          service: hasService && service 
            ? { 
                serviceName: service.serviceName,
                price: servicePrice
              }
            : null,
          bookingId: bookingId,
          addedToCalendar: true  // Флаг, что пользователь добавил бронирование в календарь
        };
        
        onSubmit(submittedData);
      }
      
      // Закрываем модальное окно
      setShowCalendarModal(false);
      setShowSuccess(true);
      onClose();
      setIsCalendarLoading(false);
    }, 1000);
  };
  
  // Обработчик отказа от добавления в календарь
  const handleDeclineCalendar = async () => {
    // Вызываем onSubmit с данными бронирования для перехода на страницу успешного бронирования
    if (onSubmit) {
      const submittedData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        telegramUserName: formData.telegramUserName,
        selectedDate: selectedDate || new Date(),
        startTime: startTime, 
        endTime: endTime,
        service: hasService && service 
          ? { 
              serviceName: service.serviceName,
              price: servicePrice
            }
          : null,
        bookingId: bookingId,
        addedToCalendar: false  // Флаг, что пользователь отказался добавлять бронирование в календарь
      };
      
      await onSubmit(submittedData);
    }
    
    // Закрываем модальное окно
    setShowCalendarModal(false);
    setShowSuccess(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.modalTitle}>
          {hasService ? 'Подтверждение бронирования' : 'Оформление заказа'}
        </h2>
        
        <div className={styles.bookingInfo}>
          {hasService && (
            <>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Дата:</span>
                <span className={styles.infoValue}>
                  {(() => {
                    if (!selectedDate) return '';
                    
                    console.log('📅 BookingModal - Расчет даты для отображения:', {
                      selectedDate: selectedDate,
                      selectedDateFormatted: selectedDate.toLocaleDateString('ru-RU'),
                      startTime: startTime,
                      endTime: endTime,
                      startTimeContext: startTimeContext,
                      endTimeContext: endTimeContext
                    });
                    
                    const formatDate = (date: Date) => {
                      return date.toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      });
                    };
                    
                    // Определяем фактические даты начала и конца с учетом контекста
                    let actualStartDate = new Date(selectedDate);
                    let actualEndDate = new Date(selectedDate);
                    
                    // Если startTime из секции "следующего дня"
                    if (startTimeContext === 'next') {
                      actualStartDate.setDate(actualStartDate.getDate() + 1);
                    }
                    
                    // Если endTime из секции "следующего дня"  
                    if (endTimeContext === 'next') {
                      actualEndDate.setDate(actualEndDate.getDate() + 1);
                    }
                    
                    // Fallback логика для случаев когда контекст не передан (например, из корзины)
                    if (!startTimeContext && !endTimeContext) {
                      // Парсим время для определения межсуточного перехода
                      let start, end;
                      
                      if (startTime.includes('—') || startTime.includes('-')) {
                        const parts = startTime.split(/[—-]/).map(s => s.trim());
                        start = parts[0];
                        end = parts[1];
                      } else {
                        start = startTime;
                        end = endTime;
                      }
                      
                      if (start && end) {
                        const [startH] = start.split(':').map(Number);
                        const [endH] = end.split(':').map(Number);
                        
                        // Если время окончания меньше времени начала, значит переход на следующий день
                        if (endH < startH) {
                          actualEndDate.setDate(actualEndDate.getDate() + 1);
                        }
                      }
                    }
                    
                    console.log('📅 BookingModal - Фактические даты с учетом контекста:', {
                      originalSelectedDate: formatDate(selectedDate),
                      actualStartDate: formatDate(actualStartDate),
                      actualEndDate: formatDate(actualEndDate),
                      startTimeContext: startTimeContext,
                      endTimeContext: endTimeContext,
                      usedFallbackLogic: !startTimeContext && !endTimeContext
                    });
                    
                    // Если даты начала и конца разные - показываем диапазон
                    if (actualStartDate.toDateString() !== actualEndDate.toDateString()) {
                      return `${formatDate(actualStartDate)} — ${formatDate(actualEndDate)}`;
                    } else {
                      // Если даты одинаковые - показываем одну дату
                      return formatDate(actualStartDate);
                    }
                  })()}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Услуга:</span>
                <span className={styles.infoValue}>{serviceRu}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Время:</span>
                <span className={styles.infoValue}>
                  {displayTime}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Длительность:</span>
                <span className={styles.infoValue}>{getDurationHours()} ч.</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Стоимость услуги: </span>
                <span className={styles.infoValue}>{servicePrice} ₽</span>
              </div>
            </>
          )}
          {products.length > 0 && products.map(product => (
            <div className={styles.infoRow} key={product.id}>
              <span className={styles.infoLabel}>{product.name} x{product.quantity}</span>
              <span className={styles.infoValue}>{product.price * product.quantity} ₽</span>
            </div>
          ))}
          {products.length > 0 && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Сумма товаров:</span>
              <span className={styles.infoValue}>{productsTotal} ₽</span>
            </div>
          )}
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Итого:</span>
            <span className={styles.infoValue}>{totalPrice} ₽</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">
              Ваше имя
            </label>
            <input
              className={`${styles.input} ${fieldErrors.name ? styles.inputError : ''}`}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ваше имя"
              maxLength={40}
            />
            {fieldErrors.name && <div className={styles.errorMessage}>{fieldErrors.name}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phone">
              Телефон
            </label>
            <PhoneInput
              country="RU"
              international
              withCountryCallingCode
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
              placeholder="+7 (___) ___-__-__"
              disabled={isLoading}
            />
            {fieldErrors.phone && <div className={styles.errorMessage}>{fieldErrors.phone}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              className={styles.input}
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              maxLength={40}
            />
            {fieldErrors.email && (
              <div className={styles.errorMessage}>{fieldErrors.email}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="telegramUserName">
              Telegram Username
            </label>
            <input
              className={`${styles.input} ${fieldErrors.telegramUserName ? styles.inputError : ''}`}
              type="text"
              id="telegramUserName"
              name="telegramUserName"
              value={formData.telegramUserName}
              onChange={handleChange}
              placeholder="@username"
              maxLength={32}
            />
            {fieldErrors.telegramUserName && <div className={styles.errorMessage}>{fieldErrors.telegramUserName}</div>}
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Отправка...' : 'Подтвердить'}
          </button>
        </form>
      </div>
      <SuccessPopup isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      {eventDetails && bookingId !== null && (
        <CalendarConfirmModal
          isOpen={showCalendarModal}
          onClose={handleDeclineCalendar}
          onConfirm={handleAddToCalendar}
          bookingId={bookingId}
          event={eventDetails}
          isLoading={isCalendarLoading}
        />
      )}
    </div>
  );
};

export default BookingModal;