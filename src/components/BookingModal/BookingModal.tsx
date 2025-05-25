import React, { useState, useEffect } from 'react';
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
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  telegramUserName: string;
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  startTime,
  endTime,
  service,
  onSubmit,
  selectedDate,
  isAdmin,
  prefilledData
}) => {
  console.log('BookingModal received selectedDate:', selectedDate, typeof selectedDate, selectedDate instanceof Date);
  
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
  const serviceNameMap: Record<string, string> = {
    'Мойка авто': 'Мойка авто',
    'Сухой пост': 'Сухой пост',
    'Химчистка': 'Химчистка',
    'Полировка': 'Полировка',
  };

  // Вычисление количества часов бронирования
  const getDurationHours = () => {
    try {
      const parts = startTime.split(/[—-]/).map(s => s.trim());
      const start = parts[0];
      const end = parts[1] || parts[0];
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      let hours = endH - startH;
      if (endM - startM > 0) hours += 1;
      return hours > 0 ? hours : 1;
    } catch {
      return 1;
    }
  };
  const durationHours = getDurationHours();
  
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
  const servicePrice = isFromCart ? baseServicePrice : baseServicePrice * durationHours;
  
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
    if (!validate()) return;
    
    // alert('Начало отправки формы бронирования');
    
    setIsLoading(true);
    setError(null);
    try {
      if (!chatId) throw new Error('Telegram ID не получен');
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
      
      console.log('Parsed times:', { startTimeStr, endTimeStr, originalStartTime: startTime, originalEndTime: endTime });
      
      const date = selectedDate || new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      
      // Создаем даты для начала и конца
      let startDate = new Date(date);
      let endDate = new Date(date);
      
      // Парсим время
      const [startHour, startMinute] = startTimeStr.split(':').map(Number);
      const [endHour, endMinute] = endTimeStr.split(':').map(Number);
      
      startDate.setHours(startHour, startMinute, 0, 0);
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // Если время окончания меньше времени начала, значит оно на следующий день
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      
      console.log('Final ISO dates:', { startISO, endISO });

      const payload = {
        telegramUserId: parseInt(chatId),
        telegramUserName: formData.telegramUserName,
        clientName: formData.name,
        clientPhone: formData.phone.replace('+',''),
        clientEmail: formData.email,
        start: startISO,
        end: endISO,
        service: hasService ? [{ serviceName: service!.serviceName, price: servicePrice }] : [],
        products: products.length
          ? products.map(p => ({ name: p.name, price: p.price, quantity: p.quantity }))
          : undefined,
        notes: ''
      };

      // alert('Отправка запроса на API календаря...');
      
      const res = await api.post('/calendar/booking', payload);
      
      // alert('Получен ответ от API. Проверяем наличие bookingId');
      
      const id = res.data?.data?.bookingId;
      if (!id) throw new Error('bookingId не вернулся');
      
      // alert(`Получен bookingId: ${id}`);
      
      setBookingId(id);

      // собираем детали события
      setEventDetails({
        title: `Бронирование: ${service?.serviceName ?? ''}`,
        description: `Услуги: ${service?.serviceName ?? ''}\nКонтакт: ${formData.name}, тел: ${formData.phone}`,
        location: 'Self-Detailing Location',
        start: new Date(startISO),
        end: new Date(endISO),
      });

      // alert('Детали события созданы. Открываем модальное окно календаря');
      
      // открываем наше модальное окно
      setShowCalendarModal(true);
      
      // alert('Флаг showCalendarModal установлен в true');
      //
      // // уведомляем в Telegram
      // alert('Отправка уведомлений в Telegram...');
      //
      const adminMsg = formatAdminMessage(payload, { price: servicePrice }, service?.serviceName ?? '');
      const userMsg  = formatUserMessage(payload, { price: servicePrice }, service?.serviceName ?? '');
      if (isAdmin) {
        await sendTelegramMessageToAllAdmins(adminMsg);
      } else {
        await Promise.all([
          sendTelegramMessage(userMsg, chatId),
          sendTelegramMessageToAllAdmins(adminMsg)
        ]);
      }
      
      // alert('Уведомления в Telegram отправлены успешно');

    } catch (err: any) {
      alert(`Ошибка при бронировании: ${err.message}`);
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
      // alert(`Бронирование успешно добавлено! ID: ${bookingId}`);
      
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

  console.log('Состояние модального окна:', {
    showCalendarModal,
    bookingId,
    hasEventDetails: !!eventDetails
  });

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
                <span className={styles.infoValue}>{durationHours} ч.</span>
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