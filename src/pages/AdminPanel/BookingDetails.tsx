import React, { useState, useEffect } from 'react';
import styles from './AdminPanel.module.css';
import api from '../../api/apiService';

interface BookingDetailsProps {
  bookingId: number | string;
  onClose?: () => void;
  onEdit?: (bookingId: number | string) => void;
  onCancel?: (bookingId: number | string) => void;
}

interface BookingData {
  bookingId: number;
  telegramUserId?: number;
  telegramUserName?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  start: string;
  end: string;
  services: Array<{
    id: number;
    serviceName: string;
    price: number;
  }>;
  notes?: string;
  products?: any[];
  status?: string;
}

const BookingDetails: React.FC<BookingDetailsProps> = ({ bookingId, onClose, onEdit, onCancel }) => {
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для проверки межсуточного бронирования
  const isCrossingDays = (start: string, end: string): boolean => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return startDate.toDateString() !== endDate.toDateString();
  };

  // Функция для форматирования отображения дат
  const formatDateDisplay = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isCrossingDays(start, end)) {
      return `${startDate.toLocaleDateString('ru-RU')} — ${endDate.toLocaleDateString('ru-RU')}`;
    } else {
      return startDate.toLocaleDateString('ru-RU');
    }
  };

  // Функция для форматирования отображения времени с индикаторами
  const formatTimeDisplay = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startTime = startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const endTime = endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    if (isCrossingDays(start, end)) {
      return `${startTime} — ${endTime}`;
    } else {
      return `${startTime} — ${endTime}`;
    }
  };

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError('ID бронирования не указан');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Преобразуем bookingId в число для API запроса
        const bookingIdValue = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
        
        const response = await api.get(`/calendar/booking/${bookingIdValue}`);
        
        if (!response.data) {
          throw new Error('Неверный формат ответа от сервера');
        }

        const data = response.data;
        
        if (!data.success) {
          throw new Error(data.message || 'Ошибка при получении данных');
        }

        if (!data.data) {
          throw new Error('Данные бронирования не найдены');
        }

        const bookingData = data.data;
        
        setBooking(bookingData);
      } catch (error: any) {
        console.error('Ошибка при загрузке деталей бронирования:', error);
        setError(`Не удалось загрузить данные: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  const renderServiceInfo = () => {
    if (!booking) return null;
    
    if (!booking.services || !Array.isArray(booking.services) || booking.services.length === 0) {
      return (
        <div className={styles.detailItem}>
          <span>Услуга:</span>
          <span>Не указана</span>
        </div>
      );
    }
    
    if (booking.services.length === 1) {
      return (
        <div className={styles.detailItem}>
          <span>Услуга:</span>
          <span>{booking.services[0].serviceName}</span>
        </div>
      );
    }
    
    return (
      <>
        <div className={styles.detailItem}>
          <span>Услуги:</span>
          <span>{booking.services.length} услуг</span>
        </div>
        <div className={styles.servicesList}>
          {booking.services.map((service, index) => (
            <div key={index} className={styles.serviceItem}>
              <span>{service.serviceName}</span>
              <span>{service.price} ₽</span>
            </div>
          ))}
        </div>
      </>
    );
  };
  
  const getServicePrice = () => {
    if (!booking) return 0;
    
    if (!booking.services || !Array.isArray(booking.services) || booking.services.length === 0) {
      return 0;
    }
    
    return booking.services[0].price || 0;
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка данных бронирования...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <strong>Ошибка:</strong> {error}
        <div className={styles.errorActions}>
          {onClose && (
            <button className={styles.closeErrorBtn} onClick={onClose}>
              Закрыть
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.error}>
        <strong>Бронирование не найдено</strong>
        <div className={styles.errorActions}>
          {onClose && (
            <button className={styles.closeErrorBtn} onClick={onClose}>
              Закрыть
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bookingDetailsContainer}>
      <div className={styles.bookingDetailsHeader}>
        <h3>Детали бронирования #{booking.bookingId}</h3>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} title="Закрыть">×</button>
        )}
      </div>
      
      <div className={styles.bookingDetailsContent}>
        <div className={styles.detailItem}>
          <span>Клиент:</span>
          <span>{booking.clientName}</span>
        </div>
        
        <div className={styles.detailItem}>
          <span>Телефон:</span>
          <span>{booking.clientPhone}</span>
        </div>
        
        {booking.clientEmail && (
          <div className={styles.detailItem}>
            <span>Email:</span>
            <span>{booking.clientEmail}</span>
          </div>
        )}
        
        {renderServiceInfo()}
        
        <div className={styles.detailItem}>
          <span>Дата:</span>
          <span>
            {formatDateDisplay(booking.start, booking.end)}
          </span>
        </div>
        
        <div className={styles.detailItem}>
          <span>Время:</span>
          <span>
            {formatTimeDisplay(booking.start, booking.end)}
          </span>
        </div>
        
        <div className={styles.detailItem}>
          <span>Стоимость:</span>
          <span>{getServicePrice()} ₽</span>
        </div>
        
        <div className={styles.actionButtons}>
          {/* <button 
            onClick={() => onEdit ? onEdit(booking.bookingId) : undefined}
            className={styles.editButton}
          >
            Изменить
          </button> */}
          <button 
            onClick={() => onCancel ? onCancel(booking.bookingId) : undefined}
            className={styles.cancelButton}
          >
            Отменить
          </button>
        </div>
        
        {booking.notes && booking.notes.trim() !== '' && (
          <div className={styles.detailItem}>
            <span>Комментарий:</span>
            <span>{booking.notes}</span>
          </div>
        )}
        
        {booking.status && (
          <div className={styles.detailItem}>
            <span>Статус:</span>
            <span>{booking.status}</span>
          </div>
        )}
      </div>
      
      {booking.products && booking.products.length > 0 && (
        <div className={styles.productsSection}>
          <h4>Дополнительные товары:</h4>
          <div className={styles.productsList}>
            {booking.products.map((product, index) => (
              <div key={index} className={styles.productItem}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productQuantity}>{product.quantity} шт.</span>
                <span className={styles.productPrice}>{product.price} ₽</span>
              </div>
            ))}
          </div>
          <div className={styles.detailItem}>
            <span>Итого за товары:</span>
            <span>
              {booking.products.reduce((sum, product) => sum + (product.price * (product.quantity || 1)), 0)} ₽
            </span>
          </div>
        </div>
      )}
      
      <div className={styles.bookingTotalSection}>
        <div className={styles.detailItem}>
          <span><strong>Общая сумма:</strong></span>
          <span><strong>{getServicePrice()} ₽</strong></span>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails; 