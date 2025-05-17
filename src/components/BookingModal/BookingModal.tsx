// src/components/BookingModal/BookingModal.tsx
import React, { useState, useEffect } from 'react';
import styles from './BookingModal.module.css';
import SuccessPopup from '../SuccessPopup/SuccessPopup';
import CalendarConfirmModal from '../CalendarConfirmModal/CalendarConfirmModal';
import PhoneInput from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';
import { useCart } from '../../context/CartContex';
import api from '../../api/apiService';
import {
  sendTelegramMessage,
  sendTelegramMessageByUsername,
  formatUserMessage,
  formatAdminMessage,
  sendTelegramMessageToAllAdmins
} from '../../api/telegram';
import { openICS } from '../../utils/calendarUtils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: string;
  endTime: string;
  service?: {
    serviceName: string;
    price: number;
  } | null;
  onSubmit: (submittedData: any) => void;
  selectedDate: Date | null;
  isAdmin?: boolean;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  telegramUserName: string;
}

interface EventDetails {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
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
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const { items } = useCart();
  const products = items.filter(i => i.type !== 'booking');
  const productsTotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  // booking state
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  // event details for calendar links
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);

  // format display time
  const [displayTime, setDisplayTime] = useState('');
  useEffect(() => {
    const times = startTime.match(/\d{1,2}:\d{2}/g) || [];
    if (times.length >= 2) setDisplayTime(`${times[0]} — ${times[1]}`);
    else if (times.length === 1 && endTime) setDisplayTime(`${times[0]} — ${endTime}`);
    else setDisplayTime(startTime);
  }, [startTime, endTime]);

  // map service names
  const serviceNameMap: Record<string, string> = {
    'Мойка авто': 'Мойка авто',
    'Сухой пост': 'Сухой пост',
    'Химчистка': 'Химчистка',
    'Полировка': 'Полировка',
  };
  const hasService = Boolean(service && service.serviceName);
  const serviceRu = hasService ? (serviceNameMap[service!.serviceName] || service!.serviceName) : '';
  const basePrice = service?.price ?? 0;

  // calculate hours
  const durationHours = (() => {
    try {
      const [s, e] = (startTime.match(/\d{1,2}:\d{2}/g) || [startTime, endTime]);
      const [sh, sm] = s.split(':').map(Number);
      const [eh, em] = e.split(':').map(Number);
      let h = eh - sh + (em > sm ? 1 : 0);
      return h > 0 ? h : 1;
    } catch {
      return 1;
    }
  })();

  const isFromCart = window.location.href.includes('/cart');
  const servicePrice = isFromCart ? basePrice : basePrice * durationHours;
  const totalPrice = (hasService ? servicePrice : 0) + productsTotal;

  // get Telegram WebApp user ID
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      setChatId(tg.initDataUnsafe.user.id.toString());
      tg.ready?.();
    }
  }, []);

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!formData.name.trim()) errs.name = 'Введите ваше имя';
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) errs.phone = 'Введите номер телефона';
    else if (!formData.phone.startsWith('+7')) errs.phone = 'Номер должен начинаться с +7';
    else if (phoneDigits.length !== 11) errs.phone = 'Номер должен содержать 11 цифр';
    if (!formData.email.trim()) errs.email = 'Введите email';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Введите корректный email';
    if (!formData.telegramUserName.trim()) errs.telegramUserName = 'Введите ваш username в Telegram';
    else if (!formData.telegramUserName.startsWith('@')) errs.telegramUserName = 'Начинается с @';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setError(null);
    try {
      if (!chatId) throw new Error('Не удалось получить Telegram ID');
      const times = startTime.match(/\d{1,2}:\d{2}/g)!;
      const sTime = times[0], eTime = times[1] || times[0];
      const dateObj = selectedDate || new Date();
      const YYYY = dateObj.getFullYear();
      const MM = String(dateObj.getMonth()+1).padStart(2,'0');
      const DD = String(dateObj.getDate()).padStart(2,'0');
      const dateStr = `${YYYY}-${MM}-${DD}`;
      const startISO = `${dateStr}T${sTime}:00`;
      const endISO   = `${dateStr}T${eTime}:00`;

      const payload = {
        telegramUserId: parseInt(chatId),
        telegramUserName: formData.telegramUserName,
        clientName: formData.name,
        clientPhone: formData.phone.replace('+',''),
        clientEmail: formData.email,
        start: startISO,
        end: endISO,
        service: hasService ? [{ serviceName: service!.serviceName, price: servicePrice }] : [],
        products: products.length ? products.map(p => ({
          name: p.name, price: p.price, quantity: p.quantity
        })) : undefined,
        notes: ''
      };

      const res = await api.post('/calendar/booking', payload);
      const id = res.data?.data?.bookingId;
      if (!id) throw new Error('Нет bookingId в ответе');
      setBookingId(id);

      // prepare event details
      setEventDetails({
        title: `Бронирование: ${serviceRu}`,
        description: `Услуги: ${serviceRu}\nКонтакт: ${formData.name}, тел: ${formData.phone}`,
        location: 'Self-Detailing Location',
        start: new Date(startISO),
        end:   new Date(endISO),
      });

      setShowCalendarModal(true);

      // send Telegram notifications
      const isTech = serviceRu.toLowerCase().includes('техничес');
      if (isAdmin) {
        if (isTech) {
          await sendTelegramMessageToAllAdmins(formatAdminMessage(payload, { price: servicePrice }, serviceRu));
        } else {
          await Promise.all([
            sendTelegramMessageByUsername(formatUserMessage(payload, { price: servicePrice }, serviceRu), formData.telegramUserName),
            sendTelegramMessageToAllAdmins(formatAdminMessage(payload, { price: servicePrice }, serviceRu))
          ]);
        }
      } else {
        await Promise.all([
          sendTelegramMessage(formatUserMessage(payload, { price: servicePrice }, serviceRu), chatId),
          sendTelegramMessageToAllAdmins(formatAdminMessage(payload, { price: servicePrice }, serviceRu))
        ]);
      }

    } catch (err: any) {
      setError(err.message || 'Ошибка при бронировании');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(v => ({ ...v, [name]: value }));
    setFieldErrors(v => ({ ...v, [name]: undefined }));
  };

  const handlePhoneChange = (value?: string) => {
    if (!value) return setFormData(v => ({ ...v, phone: '' }));
    const digits = value.replace(/\D/g,'');
    if (digits.length <= 11) setFormData(v => ({ ...v, phone: value }));
    setFieldErrors(v => ({ ...v, phone: undefined }));
  };

  const handleAddToCalendar = () => {
    if (!bookingId || !eventDetails) return;
    setIsCalendarLoading(true);
    try {
      openICS(bookingId);
      // notify parent
      onSubmit({
        ...eventDetails,
        bookingId,
        addedToCalendar: true,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        telegramUserName: formData.telegramUserName,
      });
      setShowCalendarModal(false);
      setIsCalendarLoading(false);
    } catch {
      setIsCalendarLoading(false);
      alert('Не удалось добавить в календарь');
    }
  };

  const handleDeclineCalendar = () => {
    onSubmit({
      bookingId,
      addedToCalendar: false,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      telegramUserName: formData.telegramUserName,
    });
    setShowCalendarModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
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
                <span className={styles.infoValue}>{displayTime}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Длительность:</span>
                <span className={styles.infoValue}>{durationHours} ч.</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Стоимость:</span>
                <span className={styles.infoValue}>{servicePrice} ₽</span>
              </div>
            </>
          )}
          {products.map(p => (
            <div key={p.id} className={styles.infoRow}>
              <span className={styles.infoLabel}>{p.name} x{p.quantity}</span>
              <span className={styles.infoValue}>{p.price * p.quantity} ₽</span>
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
            <label htmlFor="name">Ваше имя</label>
            <input
              id="name" name="name"
              className={`${styles.input} ${fieldErrors.name ? styles.inputError : ''}`}
              value={formData.name}
              onChange={handleChange}
              placeholder="Ваше имя" maxLength={40}
            />
            {fieldErrors.name && <div className={styles.errorMessage}>{fieldErrors.name}</div>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone">Телефон</label>
            <PhoneInput
              country="RU" international withCountryCallingCode
              id="phone" name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
              placeholder="+7 (___) ___-__-__" disabled={isLoading}
            />
            {fieldErrors.phone && <div className={styles.errorMessage}>{fieldErrors.phone}</div>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com" maxLength={40}
            />
            {fieldErrors.email && <div className={styles.errorMessage}>{fieldErrors.email}</div>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="telegramUserName">Telegram Username</label>
            <input
              id="telegramUserName" name="telegramUserName"
              className={`${styles.input} ${fieldErrors.telegramUserName ? styles.inputError : ''}`}
              value={formData.telegramUserName}
              onChange={handleChange}
              placeholder="@username" maxLength={32}
            />
            {fieldErrors.telegramUserName && <div className={styles.errorMessage}>{fieldErrors.telegramUserName}</div>}
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Отправка...' : 'Подтвердить'}
          </button>
        </form>

        <SuccessPopup isOpen={false} onClose={() => {}} />
        <CalendarConfirmModal
          isOpen={showCalendarModal}
          onClose={handleDeclineCalendar}
          onConfirm={handleAddToCalendar}
          bookingId={bookingId!}
          event={eventDetails!}
          isLoading={isCalendarLoading}
        />
      </div>
    </div>
  );
};

export default BookingModal;
