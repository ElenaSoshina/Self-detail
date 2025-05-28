import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './UserProfile.module.css';
import api from '../../api/apiService';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  bookings: {
    id: string;
    start: string;
    end: string;
    plan: {
      title: string;
      price: number;
    };
    hours: number;
    totalPrice: number;
  }[];
  purchases: {
    id: string;
    date: string;
    product: string;
    amount: number;
    price: number;
  }[];
  totalSpent: number;
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingsOpen, setBookingsOpen] = useState(true);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Получаем данные о бронированиях пользователя
        const bookingsResponse = await api.get('/calendar/booking', {
          params: { telegramUserId: userId }
        });
        
        if (!bookingsResponse.data || !bookingsResponse.data.data) {
          setError('Пользователь не найден');
          return;
        }
        
        const bookings = bookingsResponse.data.data;
        
        if (bookings.length === 0) {
          setError('Пользователь не найден');
          return;
        }
        
        // Берем данные первого бронирования для получения информации о пользователе
        const firstBooking = bookings[0];
        
        // Вычисляем общую потраченную сумму
        const totalSpent = bookings.reduce((sum: number, booking: any) => {
          const servicePrice = booking.services && booking.services.length > 0 
            ? booking.services[0].price 
            : 0;
          return sum + servicePrice;
        }, 0);
        
        // Формируем объект пользователя
        const userData: User = {
          id: String(firstBooking.telegramUserId),
          name: firstBooking.clientName || 'Клиент',
          phone: firstBooking.clientPhone || 'Телефон не указан',
          email: firstBooking.clientEmail || 'Email не указан',
          bookings: bookings.map((booking: any) => {
            const serviceName = booking.services && booking.services.length > 0 
              ? booking.services[0].serviceName 
              : 'Услуга';
            
            const servicePrice = booking.services && booking.services.length > 0 
              ? booking.services[0].price 
              : 0;
              
            // Вычисляем продолжительность в часах
            const startDate = new Date(booking.start);
            const endDate = new Date(booking.end);
            const diffMs = endDate.getTime() - startDate.getTime();
            const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
            
            return {
              id: String(booking.bookingId),
              start: booking.start,
              end: booking.end,
              plan: {
                title: serviceName,
                price: servicePrice
              },
              hours: hours,
              totalPrice: servicePrice
            };
          }),
          purchases: [], // Пока нет API для покупок
          totalSpent: totalSpent
        };
        
        setUser(userData);
      } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        setError('Ошибка при загрузке данных пользователя');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!user) {
    return <div className={styles.error}>Пользователь не найден</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/admin')}>
          ← Назад
        </button>
        <h2>Профиль пользователя</h2>
      </div>

      <div className={styles.userInfo}>
        <div className={styles.infoItem}>
          <span>Имя:</span>
          <span>{user.name}</span>
        </div>
        <div className={styles.infoItem}>
          <span>Телефон:</span>
          <span>{user.phone}</span>
        </div>
        <div className={styles.infoItem}>
          <span>Email:</span>
          <span>{user.email}</span>
        </div>
        <div className={styles.infoItem}>
          <span>Всего потрачено:</span>
          <span>{user.totalSpent} ₽</span>
        </div>
      </div>

      <div className={styles.bookingsHistory}>
        <div
          className={styles.collapseHeader}
          onClick={() => setBookingsOpen((v) => !v)}
        >
          <span>История бронирований</span>
          <span className={bookingsOpen ? styles.arrowOpen : styles.arrowClosed}>▼</span>
        </div>
        {bookingsOpen && (
          <div className={styles.bookingsList}>
            {user.bookings.map((booking) => (
              <div key={booking.id} className={styles.bookingItem}>
                <div className={styles.bookingDate}>
                  {new Date(booking.start).toLocaleDateString('ru-RU')} {new Date(booking.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={styles.bookingDetails}>
                  <div>Услуга: {booking.plan.title}</div>
                  <div>Продолжительность: {booking.hours} ч.</div>
                  <div>Стоимость: {booking.totalPrice} ₽</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user.purchases && user.purchases.length > 0 && (
        <div className={styles.purchasesHistory}>
          <div
            className={styles.collapseHeader}
            onClick={() => setPurchasesOpen((v) => !v)}
          >
            <span>История покупок</span>
            <span className={purchasesOpen ? styles.arrowOpen : styles.arrowClosed}>▼</span>
          </div>
          {purchasesOpen && (
            <div className={styles.purchasesList}>
              {user.purchases.map((purchase) => (
                <div key={purchase.id} className={styles.purchaseItem}>
                  <div className={styles.purchaseDate}>
                    {new Date(purchase.date).toLocaleDateString('ru-RU')} {new Date(purchase.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={styles.purchaseDetails}>
                    <div>Товар: {purchase.product}</div>
                    <div>Кол-во: {purchase.amount}</div>
                    <div>Стоимость: {purchase.price} ₽</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile; 