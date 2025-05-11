import React, { useState, useEffect } from 'react';
import styles from './AdminPanel.module.css';

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
  console.log('BookingDetails рендерится, получен bookingId:', bookingId, 'Тип:', typeof bookingId);
  
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!bookingId && bookingId !== 0) {
        setError('ID бронирования не указан');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('Загрузка данных бронирования, ID:', bookingId, 'Тип:', typeof bookingId);
        
        const bookingIdValue = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
        const apiUrl = `https://backend.self-detailing.duckdns.org/api/v1/calendar/booking/${bookingIdValue}`;
        console.log('Запрос к API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('Ошибка API ответа:', response.status, response.statusText);
          throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Полный ответ API:', data);
        
        if (!data) {
          const errorMsg = 'Пустой ответ от сервера';
          console.error('Ошибка в ответе API:', errorMsg);
          throw new Error(errorMsg);
        }
        
        if (!data.success) {
          const errorMsg = data.errorMessage || 'Неверный формат данных';
          console.error('Ошибка в ответе API:', errorMsg);
          throw new Error(errorMsg);
        }
        
        if (!data.data) {
          const errorMsg = 'Отсутствуют данные в ответе';
          console.error('Ошибка в ответе API:', errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log('Данные бронирования:', data.data);
        console.log('Поля бронирования:', {
          bookingId: data.data.bookingId,
          clientName: data.data.clientName,
          clientPhone: data.data.clientPhone,
          clientEmail: data.data.clientEmail,
          services: data.data.services,
          telegramUserName: data.data.telegramUserName,
          start: data.data.start,
          end: data.data.end,
          notes: data.data.notes
        });
        
        setBooking(data.data);
        setLoading(false);
      } catch (error: any) {
        console.error('Ошибка при загрузке данных бронирования:', error);
        setError(`Не удалось загрузить данные бронирования: ${error.message || 'Неизвестная ошибка'}`);
        setLoading(false);
      }
    };

    fetchBookingData();
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
          <span>{new Date(booking.start).toLocaleDateString('ru-RU')}</span>
        </div>
        
        <div className={styles.detailItem}>
          <span>Время:</span>
          <span>
            {new Date(booking.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — 
            {new Date(booking.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className={styles.detailItem}>
          <span>Стоимость:</span>
          <span>{getServicePrice()} ₽</span>
        </div>
        
        {booking.telegramUserName && (
          <div className={styles.detailItem}>
            <span>Telegram:</span>
            <span>{booking.telegramUserName}</span>
          </div>
        )}
        
        {booking.telegramUserId && (
          <div className={styles.detailItem}>
            <span>Telegram ID:</span>
            <span>{booking.telegramUserId}</span>
          </div>
        )}
        
        <div className={styles.actionButtons}>
          {/* <button 
            onClick={() => onEdit ? onEdit(booking.bookingId) : console.log('Редактирование бронирования', booking.bookingId)}
            className={styles.editButton}
          >
            Изменить
          </button> */}
          <button 
            onClick={() => onCancel ? onCancel(booking.bookingId) : console.log('Отмена бронирования', booking.bookingId)}
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