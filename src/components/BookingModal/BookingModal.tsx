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

      // Формируем данные для onSubmit
      const submittedData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        telegramUserName: formData.telegramUserName,
        selectedDate: selectedDate,
        startTime: hasService ? (displayTime.split(' - ')[0] || startTime) : '', 
        endTime: hasService ? (displayTime.split(' - ')[1] || endTime) : '',
        service: hasService && service 
          ? { 
              serviceName: service.serviceName,
              price: servicePrice
            }
          : null
      };
      
      console.log('Данные, передаваемые в onSubmit:', submittedData);
      
      // Вызываем функцию onSubmit для создания бронирования
      if (onSubmit) {
        await onSubmit(submittedData);
      }

      // Формируем данные в соответствии с API
      const bookingData = {
        telegramUserId: parseInt(chatId || '0'),
        telegramUserName: formData.telegramUserName.startsWith('@') 
          ? formData.telegramUserName 
          : `@${formData.telegramUserName}`,
        clientName: formData.name,
        clientPhone: formData.phone.replace(/\+/g, ''),
        clientEmail: formData.email,
        start: hasService 
          ? formatDateTime(displayTime.split(' - ')[0] || startTime, 'start')
          : new Date().toISOString().replace(/\.\d{3}Z$/, ''),
        end: hasService 
          ? formatDateTime(displayTime.split(' - ')[1] || displayTime.split(' - ')[0] || startTime, 'end')
          : new Date().toISOString().replace(/\.\d{3}Z$/, ''),
        service: hasService && service
          ? [{
              serviceName: service.serviceName,
              price: servicePrice
            }]
          : [],
        notes: '',
        products: products.map(p => ({
          productName: p.name,
          price: p.price,
          quantity: p.quantity
        }))
      };

      console.log(`Проверка структуры данных перед отправкой:`, {
        service: bookingData.service,
        hasService: hasService,
        serviceObj: service
      });

      alert(`Данные для отправки: ${JSON.stringify(bookingData, null, 2)}`);

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
        let errorData = null;
        try {
          const errorText = await response.text();
          alert(`Ответ сервера: ${errorText}`);
          
          try {
            errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            alert(`Ошибка при парсинге ответа: ${parseError}`);
          }
        } catch (e) {
          alert(`Ошибка при получении текста ответа: ${e}`);
        }
        alert(`Детали ошибки: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      // Отправка сообщений в Telegram
      try {
        const isTech = (service?.serviceName || '').toLowerCase().includes('техничес');
        if (isAdmin) {
          if (isTech) {
            // Только админу
            await sendTelegramMessage(
              formatAdminMessage(bookingData, { ...service, price: totalPrice }, serviceRu),
              ADMIN_CHAT_ID
            );
          } else {
            // Пользователю по username через endpoint и админу
            await Promise.all([
              sendTelegramMessageByUsername(
                formatUserMessage(bookingData, { ...service, price: totalPrice }, serviceRu),
                formData.telegramUserName
              ),
              sendTelegramMessage(
                formatAdminMessage(bookingData, { ...service, price: totalPrice }, serviceRu),
                ADMIN_CHAT_ID
              ),
            ]);
          }
        } else {
          // Обычный пользователь — по chatId и админу
          await Promise.all([
            sendTelegramMessage(
              formatUserMessage(bookingData, { ...service, price: totalPrice }, serviceRu),
              chatId
            ),
            sendTelegramMessage(
              formatAdminMessage(bookingData, { ...service, price: totalPrice }, serviceRu),
              ADMIN_CHAT_ID
            ),
          ]);
        }
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
      alert(`Ошибка при отправке формы: ${error}`);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при отправке формы. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция форматирования времени для API
  const formatDateTime = (rangeStr: string, type: 'start' | 'end') => {
    if (!rangeStr) {
      throw new Error('Время не указано');
    }
    if (!selectedDate || isNaN(new Date(selectedDate).getTime())) {
      throw new Error('Некорректная или не передана дата бронирования: ' + String(selectedDate));
    }
    try {
      const parts = rangeStr.split(/[—-]/).map(s => s.trim());
      console.log('Разбор времени:', parts);
      let timeStr = '';
      if (type === 'start') {
        timeStr = parts[0];
      } else {
        timeStr = parts[1] || parts[0];
      }
      console.log(`Извлеченное время (${type}):`, timeStr);
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Неверный формат времени');
      }

      // Создаем новую дату из выбранной даты
      const date = new Date(selectedDate);
      // Устанавливаем часы и минуты
      date.setHours(hours, minutes, 0, 0);
      
      // Форматируем дату в нужном формате YYYY-MM-DDTHH:MM:SS без миллисекунд
      const isoString = date.toISOString();
      const formattedDate = isoString.replace(/\.\d{3}Z$/, '');
      
      console.log(`Итоговая дата (${type}):`, formattedDate);
      return formattedDate;
    } catch (error) {
      console.error(`Ошибка при форматировании времени (${type}):`, error);
      throw error;
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