import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './UserProfile.module.css';
import { mockUsers, User } from './mockData';

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
        // Имитация задержки загрузки
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const foundUser = mockUsers.find(u => u.id === userId);
        if (foundUser) {
          setUser(foundUser);
        } else {
          setError('Пользователь не найден');
        }
        setLoading(false);
      } catch (error) {
        setError('Ошибка при загрузке данных пользователя');
        setLoading(false);
      }
    };

    fetchUserData();
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