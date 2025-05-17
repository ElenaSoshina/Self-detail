import React, { useState, useEffect } from 'react';
import styles from './BookingModal.module.css';
import SuccessPopup from '../SuccessPopup/SuccessPopup';
import { sendTelegramMessage, sendTelegramMessageByUsername, formatUserMessage, formatAdminMessage, sendTelegramMessageToAllAdmins } from '../../api/telegram';
import PhoneInput from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';
import { useCart } from '../../context/CartContex';
import api from '../../api/apiService';
import CalendarConfirmModal from '../CalendarConfirmModal/CalendarConfirmModal';
import { downloadICSFile } from '../../utils/calendarUtils';

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
  isAdmin
}) => {
  console.log('BookingModal received selectedDate:', selectedDate, typeof selectedDate, selectedDate instanceof Date);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    telegramUserName: '',
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
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  
  window.alert(`Состояние модального окна календаря: ID=${bookingId}, открыто=${showCalendarModal}`);
  
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
    window.alert('Начинаем handleSubmit - отправка формы бронирования');
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (!validate()) {
      setIsLoading(false);
      return;
    }
    
    try {
      if (!chatId) {
        throw new Error('Не удалось получить ID пользователя из Telegram');
      }
      
      // Извлекаем время для запроса
      const timeMatches = startTime.match(/\d{1,2}:\d{2}/g);
      if (!timeMatches || timeMatches.length === 0) {
        throw new Error('Некорректный формат времени');
      }
      
      // Определяем начальное и конечное время
      const startTimeFormatted = timeMatches[0];
      const endTimeFormatted = timeMatches.length > 1 ? timeMatches[1] : startTimeFormatted;
      
      // Используем выбранную дату из календаря
      const dateToUse = selectedDate || new Date();
      
      // Простое форматирование выбранной даты
      const year = dateToUse.getFullYear();
      const month = dateToUse.getMonth() + 1;  // JS месяцы от 0 до 11
      const day = dateToUse.getDate();
      
      // Форматируем в строку даты в формате YYYY-MM-DD
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Собираем итоговые строки для API
      const startISODate = `${dateStr}T${startTimeFormatted}:00`;
      const endISODate = `${dateStr}T${endTimeFormatted}:00`;
      
      // Формируем данные для API
      const apiData = {
        telegramUserId: parseInt(chatId || '0'),
        telegramUserName: formData.telegramUserName.startsWith('@') 
          ? formData.telegramUserName 
          : `@${formData.telegramUserName}`,
        clientName: formData.name,
        clientPhone: formData.phone.replace(/\+/g, ''),
        clientEmail: formData.email,
        start: startISODate,
        end: endISODate,
        service: hasService && service
          ? [{
              serviceName: service.serviceName,
              price: servicePrice // Используем корректную стоимость
            }]
          : [],
        notes: '',
        // Добавляем информацию о товарах, если они есть
        products: products.length > 0 
          ? products.map(product => ({
              name: product.name,
              price: product.price,
              quantity: product.quantity
            }))
          : undefined
      };

      window.alert('Отправляем запрос на API для создания бронирования');
      // Отправляем запрос на API для создания бронирования
      const response = await api.post('/calendar/booking', apiData);

      const result = response.data;
      
      window.alert(`API ответ получен. Статус: ${response.status}`);
      
      // Сохраняем ID бронирования для дальнейшего использования и показываем модальное окно
      if (result && result.data && result.data.bookingId) {
        window.alert(`Получен ID бронирования: ${result.data.bookingId}`);
        // Устанавливаем ID бронирования и показываем модальное окно
        const newBookingId = result.data.bookingId;
        setBookingId(newBookingId);
        
        // Небольшая задержка перед отображением модального окна для гарантии обновления состояния
        setTimeout(() => {
          window.alert(`Показываем модальное окно для ID: ${newBookingId}`);
          setShowCalendarModal(true);
        }, 500);
      } else {
                  window.alert('ID бронирования не получен из API ответа!');
      }

      
      // Отправляем уведомления в Telegram
      const isTech = (service?.serviceName || '').toLowerCase().includes('техничес');
      
      try {
        if (isAdmin) {
          if (isTech) {
            // Только админу
            await sendTelegramMessageToAllAdmins(
              formatAdminMessage(apiData, 
                service ? { ...service, price: servicePrice } : { price: 0 }, 
                service?.serviceName || ''
              )
            );
          } else {
            // Пользователю по username через endpoint и админу
            await Promise.all([
              sendTelegramMessageByUsername(
                formatUserMessage(apiData, 
                  service ? { ...service, price: servicePrice } : { price: 0 }, 
                  service?.serviceName || ''
                ),
                formData.telegramUserName
              ),
              sendTelegramMessageToAllAdmins(
                formatAdminMessage(apiData, 
                  service ? { ...service, price: servicePrice } : { price: 0 }, 
                  service?.serviceName || ''
                )
              ),
            ]);
          }
        } else {
          // Обычный пользователь — по chatId и админу
          await Promise.all([
            sendTelegramMessage(
              formatUserMessage(apiData, 
                service ? { ...service, price: servicePrice } : { price: 0 }, 
                service?.serviceName || ''
              ),
              chatId
            ),
            sendTelegramMessageToAllAdmins(
              formatAdminMessage(apiData, 
                service ? { ...service, price: servicePrice } : { price: 0 }, 
                service?.serviceName || ''
              )
            ),
          ]);
        }
      } catch (telegramError) {
      }
      
      // Здесь не нужно дублировать логику показа модального окна,
      // так как мы уже показываем его выше при получении ID бронирования
      
      // Только если ID бронирования не получен, выполняем стандартную логику завершения
      if (!bookingId) {
        console.error('Не удалось получить ID бронирования');
        setShowSuccess(true);
        onClose();
        
        // Вызываем onSubmit с пустым bookingId
        if (onSubmit) {
          const submittedData = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            telegramUserName: formData.telegramUserName,
            selectedDate: dateToUse,
            startTime: startTime, 
            endTime: endTime,
            service: hasService && service 
              ? { 
                  serviceName: service.serviceName,
                  price: servicePrice
                }
              : null
          };
          await onSubmit(submittedData);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка при отправке формы');
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
    window.alert(`Вызван handleAddToCalendar, bookingId: ${bookingId}`);
    if (!bookingId) {
      window.alert('ID бронирования отсутствует, нельзя добавить в календарь');
      return;
    }
    
    setIsCalendarLoading(true);
    try {
      window.alert(`Начинаем скачивание ICS файла для ID: ${bookingId}`);
      // Скачиваем ICS файл
      await downloadICSFile(bookingId);
      
      // Вызываем onSubmit с данными бронирования и ID для перехода на страницу успешного бронирования
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
        
        await onSubmit(submittedData);
      }
      
      // Закрываем модальное окно
      setShowCalendarModal(false);
      setShowSuccess(true);
      onClose();
    } catch (error) {
      window.alert(`Ошибка при добавлении в календарь: ${error}`);
    } finally {
      setIsCalendarLoading(false);
    }
  };
  
  // Обработчик отказа от добавления в календарь
  const handleDeclineCalendar = async () => {
    window.alert('Вызван handleDeclineCalendar, пользователь отказался от добавления в календарь');
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
      {/* Явное отображение состояния модального окна для отладки */}
      {showCalendarModal && bookingId && (
        <div style={{ position: 'fixed', bottom: '10px', left: '10px', background: '#333', color: '#fff', padding: '5px', zIndex: 9999 }}>
          Модальное окно добавления в календарь должно отображаться: 
          ID={bookingId}, открыто={showCalendarModal.toString()}
        </div>
      )}
      
      <CalendarConfirmModal 
        isOpen={showCalendarModal} 
        onClose={handleDeclineCalendar}
        onConfirm={handleAddToCalendar}
        bookingId={bookingId}
        isLoading={isCalendarLoading}
      />
    </div>
  );
};

export default BookingModal;