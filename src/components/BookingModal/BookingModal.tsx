import React, { useState, useEffect } from 'react';
import styles from './BookingModal.module.css';
import SuccessPopup from '../SuccessPopup/SuccessPopup';
import { sendTelegramMessage, formatUserMessage, formatAdminMessage, ADMIN_CHAT_ID } from '../../api/telegram';

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

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя';
    }
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Введите номер телефона';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Введите корректный номер телефона';
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
    setError(Object.values(newErrors)[0] || null);
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

      // Соответствие serviceName <-> serviceRu
      const serviceNameMap: Record<string, string> = {
        'wash_car': 'Мойка авто',
        'dry_post': 'Сухой пост',
        'dry_cleaning': 'Химчистка',
        'polish': 'Полировка',
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
          price: service.price
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
        const serviceRu = serviceNameMap[service.serviceName] || service.serviceName;
        await Promise.all([
          sendTelegramMessage(formatUserMessage(bookingData, service, serviceRu), chatId),
          sendTelegramMessage(formatAdminMessage(bookingData, service, serviceRu), ADMIN_CHAT_ID),
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
            <span className={styles.infoValue}>{service.serviceName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Время:</span>
            <span className={styles.infoValue}>{startTime} - {endTime}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Стоимость:</span>
            <span className={styles.infoValue}>{service.price} ₽</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">
              Ваше имя
            </label>
            <input
              className={styles.input}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Введите ваше имя"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phone">
              Телефон
            </label>
            <input
              className={styles.input}
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+7 (___) ___-__-__"
            />
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
              required
              placeholder="your@email.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="telegramUserName">
              Telegram Username
            </label>
            <input
              className={styles.input}
              type="text"
              id="telegramUserName"
              name="telegramUserName"
              value={formData.telegramUserName}
              onChange={handleChange}
              required
              placeholder="@username"
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

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