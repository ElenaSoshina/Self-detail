import React, { useState, useEffect } from 'react';
import styles from './BookingModal.module.css';
import SuccessPopup from '../SuccessPopup/SuccessPopup';
import { sendTelegramMessage, sendTelegramMessageByUsername, formatUserMessage, formatAdminMessage, ADMIN_CHAT_ID } from '../../api/telegram';
import PhoneInput from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';
import { useCart } from '../../context/CartContex';

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
  selectedDate: Date;
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
  
  // Нормализуем отображение времени
  const [displayTime, setDisplayTime] = useState('');
  
  useEffect(() => {
    console.log('Время полученное в модальном окне:', { startTime, endTime });
    
    // Нормализуем время для отображения
    if (startTime) {
      // Ищем все числа формата ЧЧ:ММ
      const timeMatches = startTime.match(/\d{1,2}:\d{2}/g);
      if (timeMatches && timeMatches.length >= 2) {
        // Если в startTime найдены два времени, используем их
        setDisplayTime(`${timeMatches[0]} - ${timeMatches[1]}`);
        console.log('Время нормализовано из startTime:', `${timeMatches[0]} - ${timeMatches[1]}`);
      } else if (startTime && endTime) {
        // Если есть отдельные startTime и endTime
        setDisplayTime(`${startTime} - ${endTime}`);
        console.log('Время составлено из startTime и endTime:', `${startTime} - ${endTime}`);
      } else {
        // Если найдено только одно время в startTime
        setDisplayTime(startTime);
        console.log('Используется исходное время:', startTime);
      }
    }
  }, [startTime, endTime]);

  // Получаем chatId пользователя из Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      const userId = tg.initDataUnsafe.user.id.toString();
      setChatId(userId);
      tg.ready?.();
    }
  }, []);

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
  
  // Упрощенные переменные для отображения
  const hasService = Boolean(service && service.serviceName && service.serviceName !== '');
  const servicePrice = service?.price ?? 0;
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
    alert('Начало отправки формы');
    setIsLoading(true);
    setError(null);
    
    if (!validate()) {
      alert('Валидация не пройдена');
      setIsLoading(false);
      return;
    }
    
    try {
      if (!chatId) {
        alert('Нет chatId');
        throw new Error('Не удалось получить ID пользователя из Telegram');
      }
      
      alert('Исходное время: startTime=' + startTime + ', endTime=' + endTime);
      
      // Извлекаем время для запроса
      const timeMatches = startTime.match(/\d{1,2}:\d{2}/g);
      if (!timeMatches || timeMatches.length === 0) {
        throw new Error('Некорректный формат времени');
      }
      
      // Определяем начальное и конечное время
      const startTimeFormatted = timeMatches[0];  // Первое найденное время
      const endTimeFormatted = timeMatches.length > 1 ? timeMatches[1] : startTimeFormatted;  // Второе время или первое, если второго нет
      
      // Форматируем дату и время для API
      alert('Изначальная дата: ' + selectedDate.toLocaleDateString());  // Проверка исходной даты

      // Получаем данные напрямую, без изменений
      const actualDay = selectedDate.getDate(); // Текущий день месяца (1-31)
      const actualMonth = selectedDate.getMonth() + 1; // Месяц (1-12)
      const actualYear = selectedDate.getFullYear(); // Год в 4-х значном формате

      // Форматируем с ведущими нулями
      const year = actualYear.toString();
      const month = actualMonth.toString().padStart(2, '0');
      const day = actualDay.toString().padStart(2, '0');

      alert(`Правильная дата: День=${actualDay}, Месяц=${actualMonth}, Год=${actualYear}`);

      const dateStr = `${year}-${month}-${day}`;
      
      const startISODate = `${dateStr}T${startTimeFormatted}:00`;
      const endISODate = `${dateStr}T${endTimeFormatted}:00`;
      
      alert('Дата и время для API: start=' + startISODate + ', end=' + endISODate);
      
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
              price: servicePrice
            }]
          : [],
        notes: ''
      };
      
      alert('Данные для API: ' + JSON.stringify(apiData));
      
      // Отправляем запрос на API для создания бронирования
      const response = await fetch('https://backend.self-detailing.duckdns.org/api/v1/calendar/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });
      
      alert('Получен ответ от сервера: ' + response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        alert('Ошибка сервера: ' + errorText);
        throw new Error(`Ошибка сервера: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      alert('Успешный ответ сервера: ' + JSON.stringify(result));
      
      // Отправляем уведомления в Telegram
      const isTech = (service?.serviceName || '').toLowerCase().includes('техничес');
      
      try {
        if (isAdmin) {
          if (isTech) {
            // Только админу
            await sendTelegramMessage(
              formatAdminMessage(apiData, service || { price: 0 }, service?.serviceName || ''),
              ADMIN_CHAT_ID
            );
          } else {
            // Пользователю по username через endpoint и админу
            await Promise.all([
              sendTelegramMessageByUsername(
                formatUserMessage(apiData, service || { price: 0 }, service?.serviceName || ''),
                formData.telegramUserName
              ),
              sendTelegramMessage(
                formatAdminMessage(apiData, service || { price: 0 }, service?.serviceName || ''),
                ADMIN_CHAT_ID
              ),
            ]);
          }
        } else {
          // Обычный пользователь — по chatId и админу
          await Promise.all([
            sendTelegramMessage(
              formatUserMessage(apiData, service || { price: 0 }, service?.serviceName || ''),
              chatId
            ),
            sendTelegramMessage(
              formatAdminMessage(apiData, service || { price: 0 }, service?.serviceName || ''),
              ADMIN_CHAT_ID
            ),
          ]);
        }
        alert('Уведомления в Telegram отправлены');
      } catch (telegramError) {
        alert('Ошибка при отправке уведомлений в Telegram: ' + telegramError);
        console.error('Ошибка при отправке уведомлений в Telegram:', telegramError);
      }
      
      // Формируем данные для onSubmit
      if (onSubmit) {
        const submittedData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          telegramUserName: formData.telegramUserName,
          selectedDate: selectedDate,
          startTime: startTime, 
          endTime: endTime,
          service: hasService && service 
            ? { 
                serviceName: service.serviceName,
                price: servicePrice
              }
            : null
        };
        
        alert('Данные для onSubmit: ' + JSON.stringify(submittedData));
        await onSubmit(submittedData);
      }
      
      setShowSuccess(true);
      onClose();
    } catch (error) {
      alert('Ошибка при отправке формы: ' + error);
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
    </div>
  );
};

export default BookingModal; 