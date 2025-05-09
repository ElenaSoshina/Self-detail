import React, { useState, useEffect } from 'react';
import styles from './BookingModal.module.css';
import SuccessPopup from '../SuccessPopup/SuccessPopup';
import { sendTelegramMessage, formatUserMessage, formatAdminMessage, ADMIN_CHAT_ID } from '../../api/telegram';
import PhoneInput from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: string;
  endTime: string;
  service: {
    serviceName: string;
    price: number;
  };
  onSubmit: (formData: any) => void;
  selectedDate: Date;
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

  // Получаем chatId пользователя из Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    // alert('Telegram WebApp: ' + JSON.stringify(tg));
    if (tg?.initDataUnsafe?.user?.id) {
      const userId = tg.initDataUnsafe.user.id.toString();
      // alert('Получен ID пользователя: ' + userId);
      setChatId(userId);
      tg.ready?.();
    } else {
      // alert('Не удалось получить ID пользователя из Telegram WebApp');
    }
  }, []);

  // Соответствие serviceName <-> serviceRu
  const serviceNameMap: Record<string, string> = {
    'wash_car': 'Мойка авто',
    'dry_post': 'Сухой пост',
    'dry_cleaning': 'Химчистка',
    'polish': 'Полировка',
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
  const totalPrice = service.price * durationHours;
  const serviceRu = serviceNameMap[service.serviceName] || service.serviceName;

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

      // Форматируем время в ISO строку
      const formatDateTime = (rangeStr: string, type: 'start' | 'end') => {
        if (!rangeStr) {
          throw new Error('Время не указано');
        }
        if (!selectedDate || isNaN(new Date(selectedDate).getTime())) {
          throw new Error('Некорректная или не передана дата бронирования: ' + String(selectedDate));
        }
        try {
          const parts = rangeStr.split(/[—-]/).map(s => s.trim());
          let timeStr = '';
          if (type === 'start') {
            timeStr = parts[0];
          } else {
            timeStr = parts[1] || parts[0];
          }
          const [hours, minutes] = timeStr.split(':').map(Number);
          if (isNaN(hours) || isNaN(minutes)) {
            throw new Error('Неверный формат времени');
          }
          const date = new Date(selectedDate);
          date.setHours(hours + 3, minutes, 0, 0); // +3 часа для Москвы
          if (isNaN(date.getTime())) {
            throw new Error('Ошибка формирования даты: ' + String(date));
          }
          return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
        } catch (error) {
          throw error;
        }
      };

      // Формируем данные в соответствии с API
      const bookingData = {
        telegramUserId: parseInt(chatId),
        telegramUserName: formData.telegramUserName.startsWith('@') 
          ? formData.telegramUserName 
          : `@${formData.telegramUserName}`,
        clientName: formData.name,
        clientPhone: formData.phone,
        clientEmail: formData.email,
        start: formatDateTime(startTime, 'start'),
        end: formatDateTime(startTime, 'end'),
        service: [{
          serviceName: service.serviceName,
          price: totalPrice
        }],
        notes: ''
      };

      // Отправка данных на сервер
      const response = await fetch('https://backend.self-detailing.duckdns.org/api/v1/calendar/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        let errorMessage = 'Ошибка при отправке бронирования';
        try {
          const errorData = JSON.parse(await response.text());
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // alert('Ошибка при парсинге ответа: ' + e);
        }
        throw new Error(errorMessage);
      }

      // Отправка сообщений в Telegram
      try {
        await Promise.all([
          sendTelegramMessage(formatUserMessage(bookingData, { ...service, price: totalPrice }, serviceRu), chatId),
          sendTelegramMessage(formatAdminMessage(bookingData, { ...service, price: totalPrice }, serviceRu), ADMIN_CHAT_ID),
        ]);
      } catch (telegramError) {
        // alert('Ошибка при отправке сообщений в Telegram: ' + telegramError);
      }

      // Показываем попап успеха
      setShowSuccess(true);
      
      // Закрываем модальное окно через 2 секунды
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);

    } catch (error) {
      // alert('Ошибка при отправке формы: ' + error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при отправке формы. Пожалуйста, попробуйте еще раз.');
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
        <h2 className={styles.modalTitle}>Подтверждение бронирования</h2>
        
        <div className={styles.bookingInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Услуга:</span>
            <span className={styles.infoValue}>{serviceRu}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Время:</span>
            <span className={styles.infoValue}>{startTime} - {endTime}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Стоимость:</span>
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
            {isLoading ? 'Отправка...' : 'Подтвердить бронирование'}
          </button>
        </form>
      </div>
      <SuccessPopup isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
    </div>
  );
};

export default BookingModal; 