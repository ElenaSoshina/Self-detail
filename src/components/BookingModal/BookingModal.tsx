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

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: string;
  endTime: string;
  service?: { serviceName: string; price: number } | null;
  selectedDate: Date | null;
  onSubmit: (data: any) => void;
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
  isOpen, onClose,
  startTime, endTime, service,
  selectedDate, onSubmit, isAdmin
}) => {
  // -- form state
  const [formData, setFormData] = useState<FormData>({
    name: '', phone: '', email: '', telegramUserName: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -- cart & pricing
  const { items } = useCart();
  const products = items.filter(i => i.type !== 'booking');
  const productsTotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const hasService = !!service;
  const durationHours = (() => {
    const times = startTime.match(/\d{1,2}:\d{2}/g) || [];
    if (times.length < 2) return 1;
    const [sh, sm] = times[0].split(':').map(Number);
    const [eh, em] = times[1].split(':').map(Number);
    return Math.max(1, eh - sh + (em > sm ? 1 : 0));
  })();
  const basePrice = service?.price ?? 0;
  const servicePrice = (window.location.href.includes('/cart') ? basePrice : basePrice * durationHours);
  const totalPrice = (hasService ? servicePrice : 0) + productsTotal;

  // -- telegram user
  const [chatId, setChatId] = useState<string | null>(null);
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      setChatId(String(tg.initDataUnsafe.user.id));
      tg.ready?.();
    }
  }, []);

  // -- calendar modal
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  // формат показа времени
  const [displayTime, setDisplayTime] = useState('');
  useEffect(() => {
    const times = startTime.match(/\d{1,2}:\d{2}/g) || [];
    setDisplayTime(
      times.length >= 2
        ? `${times[0]} — ${times[1]}`
        : startTime
    );
  }, [startTime]);

  // валидация
  const validate = () => {
    const errs: Partial<FormData> = {};
    if (!formData.name.trim()) errs.name = 'Введите имя';
    if (!/^\+7\d{10}$/.test(formData.phone)) errs.phone = 'Номер +7XXXXXXXXXX';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Неверный email';
    if (!/^@\w{1,}$/.test(formData.telegramUserName)) errs.telegramUserName = 'Username с @';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // отправка брони
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setError(null);
    try {
      if (!chatId) throw new Error('Telegram ID не получен');
      // подготовить дату
      const times = startTime.match(/\d{1,2}:\d{2}/g)!;
      const s = times[0], eT = times[1] || times[0];
      const date = selectedDate || new Date();
      const yyyy = date.getFullYear();
      const mm   = String(date.getMonth()+1).padStart(2,'0');
      const dd   = String(date.getDate()).padStart(2,'0');
      const startISO = `${yyyy}-${mm}-${dd}T${s}:00`;
      const endISO   = `${yyyy}-${mm}-${dd}T${eT}:00`;

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

      // уведомляем в Telegram
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

    } catch (err: any) {
      setError(err.message || 'Ошибка бронирования');
    } finally {
      setIsLoading(false);
    }
  };

  // хендлеры модалки календаря
  const handleAddToCalendar = () => {
    if (!bookingId || !eventDetails) return;
    setIsCalendarLoading(true);
    // Apple/iCal
    window.location.href = `${api.defaults.baseURL}/calendar/booking/${bookingId}/ics`;
    // и родитель может получить данные
    onSubmit({ bookingId, addedToCalendar: true });
    setShowCalendarModal(false);
  };
  const handleDeclineCalendar = () => {
    onSubmit({ bookingId, addedToCalendar: false });
    setShowCalendarModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2>{hasService ? 'Подтверждение бронирования' : 'Оформление заказа'}</h2>

        {/* ИНФО ПО БРОНИ */}
        {hasService && (
          <div className={styles.bookingInfo}>
            <div><strong>Услуга:</strong> {service?.serviceName}</div>
            <div><strong>Время:</strong> {displayTime}</div>
            <div><strong>Длительность:</strong> {durationHours} ч.</div>
            <div><strong>Стоимость:</strong> {servicePrice} ₽</div>
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className={styles.bookingInfo}>
            <div>{p.name} x{p.quantity} — {p.price * p.quantity} ₽</div>
          </div>
        ))}
        <div className={styles.bookingInfo}>
          <strong>Итого:</strong> {totalPrice} ₽
        </div>

        {/* ФОРМА */}
        <form onSubmit={handleSubmit}>
          <label>Имя
            <input name="name" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}/>
            {fieldErrors.name && <div className={styles.error}>{fieldErrors.name}</div>}
          </label>
          <label>Телефон
            <PhoneInput
              country="RU" international
              value={formData.phone}
              onChange={val => setFormData(f => ({ ...f, phone: val || '' }))}
            />
            {fieldErrors.phone && <div className={styles.error}>{fieldErrors.phone}</div>}
          </label>
          <label>Email
            <input name="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}/>
            {fieldErrors.email && <div className={styles.error}>{fieldErrors.email}</div>}
          </label>
          <label>Telegram
            <input name="telegramUserName" value={formData.telegramUserName}
              onChange={e => setFormData(f => ({ ...f, telegramUserName: e.target.value }))}
            />
            {fieldErrors.telegramUserName && <div className={styles.error}>{fieldErrors.telegramUserName}</div>}
          </label>

          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Отправка...' : 'Подтвердить'}
          </button>
        </form>

        {/* Success не показываем сразу */}
        <SuccessPopup isOpen={false} onClose={()=>{}} />

        {/* Наш новый Calendar Modal */}
        {eventDetails && (
          <CalendarConfirmModal
            isOpen={showCalendarModal}
            bookingId={bookingId!}
            event={eventDetails}
            isLoading={isCalendarLoading}
            onConfirm={handleAddToCalendar}
            onClose={handleDeclineCalendar}
          />
        )}
      </div>
    </div>
  );
};

export default BookingModal;
