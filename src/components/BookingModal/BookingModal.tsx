import React, { useState } from 'react';
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
  onSubmit: (data: BookingFormData) => void;
}

export interface BookingFormData {
  telegramUserId: number;
  telegramUserName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  start: string;
  end: string;
  service: {
    serviceName: string;
    price: number;
    notes?: string;
  }[];
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  startTime,
  endTime,
  service,
  onSubmit
}) => {
  const [formData, setFormData] = useState<BookingFormData>({
    telegramUserId: 0,
    telegramUserName: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    start: startTime,
    end: endTime,
    service: [service]
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      await sendTelegramMessage(formatUserMessage(formData), formData.telegramUserName);
      await sendTelegramMessage(formatAdminMessage(formData), ADMIN_CHAT_ID);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
          <h2>Забронировать услугу</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="clientName">Имя</label>
              <input
                type="text"
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="clientPhone">Телефон</label>
              <input
                type="tel"
                id="clientPhone"
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="telegramUserName">Username Telegram</label>
              <input
                type="text"
                id="telegramUserName"
                value={formData.telegramUserName}
                onChange={(e) => setFormData({ ...formData, telegramUserName: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Выбранное время</label>
              <p>{startTime} - {endTime}</p>
            </div>
            <div className={styles.formGroup}>
              <label>Услуга</label>
              <p>{service.serviceName} - {service.price}₽</p>
            </div>
            <button type="submit" className={styles.submitButton}>
              Забронировать
            </button>
          </form>
        </div>
      </div>
      <SuccessPopup isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
    </>
  );
};

export default BookingModal; 