import React, { useState, useEffect } from 'react';
import styles from './ProfilePage.module.css';
import { useCart } from '../../context/CartContex';

interface UserInfo {
  username: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

interface Booking {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  service: string;
  cost: number;
  durationHours: number;
}

interface Purchase {
  id: string;
  name: string;
  date: string;
  price: number;
  quantity: number;
  image: string;
}

// Функция для расчета скидки на основе количества часов
const calculateDiscount = (hours: number): number => {
  if (hours >= 50) return 10;
  if (hours >= 40) return 8;
  if (hours >= 30) return 6;
  if (hours >= 20) return 4;
  if (hours >= 10) return 2;
  return 0;
};

// Функция для получения следующего порога скидки
const getNextDiscountThreshold = (hours: number): number => {
  if (hours < 10) return 10;
  if (hours < 20) return 20;
  if (hours < 30) return 30;
  if (hours < 40) return 40;
  if (hours < 50) return 50;
  return 50; // Максимальная скидка уже достигнута
};

const ProfilePage: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showBookings, setShowBookings] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [nextDiscountThreshold, setNextDiscountThreshold] = useState(0);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const { addToCart } = useCart();

  // Временные данные для бронирований (тарифы и цены из секции Pricing)
  const mockBookings: Booking[] = [
    { 
      id: '1', 
      date: '2023-10-15', 
      timeStart: '10:00', 
      timeEnd: '11:30', 
      service: 'Мойка авто', 
      cost: 2500,
      durationHours: 1.5
    },
    { 
      id: '2', 
      date: '2023-11-20', 
      timeStart: '14:00', 
      timeEnd: '16:00', 
      service: 'Сухой пост', 
      cost: 4000,
      durationHours: 2
    },
    { 
      id: '3', 
      date: '2023-12-05', 
      timeStart: '12:00', 
      timeEnd: '15:30', 
      service: 'Химчистка', 
      cost: 6000,
      durationHours: 3.5
    },
    { 
      id: '4', 
      date: '2024-01-18', 
      timeStart: '16:00', 
      timeEnd: '17:00', 
      service: 'Полировка', 
      cost: 1500,
      durationHours: 1
    },
    { 
      id: '5', 
      date: '2024-02-10', 
      timeStart: '09:00', 
      timeEnd: '12:00', 
      service: 'Химчистка', 
      cost: 8000,
      durationHours: 3
    },
    { 
      id: '6', 
      date: '2024-03-01', 
      timeStart: '13:00', 
      timeEnd: '15:30', 
      service: 'Мойка авто', 
      cost: 4500,
      durationHours: 2.5
    },
    { 
      id: '7', 
      date: '2024-04-05', 
      timeStart: '11:00', 
      timeEnd: '12:30', 
      service: 'Эконом', 
      cost: 2500,
      durationHours: 1.5
    },
  ];

  // Временные данные для покупок
  const mockPurchases: Purchase[] = [
    {
      id: 'p1',
      name: 'Полироль для пластика',
      date: '2024-01-10',
      price: 800,
      quantity: 1,
      image: 'https://via.placeholder.com/80'
    },
    {
      id: 'p2',
      name: 'Набор микрофибры',
      date: '2024-02-15',
      price: 1200,
      quantity: 2,
      image: 'https://via.placeholder.com/80'
    },
    {
      id: 'p3',
      name: 'Шампунь для автомобиля',
      date: '2024-03-05',
      price: 650,
      quantity: 1,
      image: 'https://via.placeholder.com/80'
    },
    {
      id: 'p4',
      name: 'Керамическое покрытие',
      date: '2024-03-20',
      price: 3500,
      quantity: 1,
      image: 'https://via.placeholder.com/80'
    }
  ];

  useEffect(() => {
    // Загружаем данные пользователя из Telegram WebApp
    const fetchUserData = () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user) {
          const { username, first_name, last_name, photo_url } = tg.initDataUnsafe.user;
          setUserInfo({
            username: username || first_name?.toLowerCase() || 'user',
            firstName: first_name || '',
            lastName: last_name || '',
            photoUrl: photo_url || null,
          });
        } else {
          // Если нет доступа к Telegram WebApp, устанавливаем пустые данные
          setUserInfo({
            username: 'user',
            firstName: 'Пользователь',
            lastName: '',
            photoUrl: null,
          });
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        setUserInfo({
          username: 'user',
          firstName: 'Пользователь',
          lastName: '',
          photoUrl: null,
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Загружаем временные данные 
    const loadMockData = () => {
      setBookings(mockBookings);
      setPurchases(mockPurchases);
      
      // Считаем общее количество часов бронирования
      const hours = mockBookings.reduce((total, booking) => total + booking.durationHours, 0);
      setTotalHours(hours);
      
      // Рассчитываем скидку и следующий порог
      const calculatedDiscount = calculateDiscount(hours);
      setDiscount(calculatedDiscount);
      setNextDiscountThreshold(getNextDiscountThreshold(hours));
    };

    fetchUserData();
    loadMockData();
  }, []);

  // Форматирование даты в читаемый вид
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  // Обработчик добавления товара в корзину
  const handleAddToCart = (purchase: Purchase) => {
    // Добавляем товар в корзину
    addToCart({
      id: purchase.id,
      name: purchase.name,
      price: purchase.price,
      type: 'product',
      region: '',
      details: '',
    });
    
    // Отмечаем, что товар добавлен (для изменения вида кнопки)
    setAddedToCart(prev => ({
      ...prev,
      [purchase.id]: true
    }));
    
    // Через 2 секунды возвращаем состояние кнопки к исходному
    setTimeout(() => {
      setAddedToCart(prev => ({
        ...prev,
        [purchase.id]: false
      }));
    }, 2000);
  };

  // Расчет прогресса до следующей скидки в процентах
  const calculateProgressToNextDiscount = (): number => {
    if (discount >= 10) return 100; // Максимальная скидка уже достигнута
    
    const currentThreshold = discount === 0 ? 0 : nextDiscountThreshold - 10;
    const progress = (totalHours - currentThreshold) / (nextDiscountThreshold - currentThreshold) * 100;
    
    return Math.min(Math.max(progress, 0), 100); // Ограничиваем значение от 0 до 100
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <div className={styles.userInfo}>
          {userInfo?.photoUrl ? (
            <img 
              src={userInfo.photoUrl} 
              alt={`${userInfo.firstName} ${userInfo.lastName}`} 
              className={styles.userAvatar} 
            />
          ) : (
            <div className={styles.defaultAvatar}>
              {userInfo?.firstName.charAt(0) || userInfo?.username.charAt(0) || 'П'}
            </div>
          )}
          <div className={styles.userDetails}>
            <h1 className={styles.userName}>
              {userInfo?.firstName} {userInfo?.lastName}
            </h1>
            <p className={styles.userUsername}>@{userInfo?.username}</p>
          </div>
        </div>
      </div>
      
      <div className={styles.bookingProgress}>
        <h3 className={styles.progressTitle}>Прогресс заказов</h3>
        <div className={styles.discountInfo}>
          <span className={styles.currentDiscount}>
            Текущая скидка: <strong>{discount}%</strong>
          </span>
          {discount < 10 && (
            <span className={styles.nextDiscount}>
              До скидки {discount + 2}%: еще <strong>{(nextDiscountThreshold - totalHours).toFixed(1)}</strong> ч.
            </span>
          )}
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFilled} 
            style={{ width: `${calculateProgressToNextDiscount()}%` }}
          ></div>
        </div>
        <div className={styles.progressInfo}>
          <span>Общее количество часов: <strong>{totalHours.toFixed(1)}</strong></span>
          {discount === 10 && (
            <div className={styles.maxDiscountBadge}>
              Максимальная скидка!
            </div>
          )}
        </div>
      </div>

      {/* Секция Мои бронирования */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader} 
          onClick={() => setShowBookings(!showBookings)}
        >
          <h2 className={styles.sectionTitle}>Мои бронирования</h2>
          <div className={`${styles.arrow} ${showBookings ? styles.arrowUp : ''}`}></div>
        </div>
        
        {showBookings && (
          <div className={styles.bookingsList}>
            {bookings.length > 0 ? (
              bookings.map(booking => (
                <div key={booking.id} className={styles.bookingItem}>
                  <div className={styles.bookingDate}>
                    <div className={styles.date}>{formatDate(booking.date)}</div>
                    <div className={styles.time}>{booking.timeStart} - {booking.timeEnd}</div>
                  </div>
                  <div className={styles.bookingInfo}>
                    <div className={styles.serviceName}>{booking.service}</div>
                  </div>
                  <div className={styles.bookingPrice}>
                    {booking.cost.toLocaleString()} ₽
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyList}>У вас еще нет бронирований</div>
            )}
          </div>
        )}
      </div>

      {/* Секция Мои покупки */}
      {/* <div className={styles.section}>
        <div 
          className={styles.sectionHeader} 
          onClick={() => setShowPurchases(!showPurchases)}
        >
          <h2 className={styles.sectionTitle}>Мои покупки</h2>
          <div className={`${styles.arrow} ${showPurchases ? styles.arrowUp : ''}`}></div>
        </div>
        
        {showPurchases && (
          <div className={styles.purchasesList}>
            {purchases.length > 0 ? (
              purchases.map(purchase => (
                <div key={purchase.id} className={styles.purchaseItem}>
                  <div className={styles.purchaseImage}>
                    <img src={purchase.image} alt={purchase.name} />
                  </div>
                  <div className={styles.purchaseInfo}>
                    <div className={styles.purchaseName}>{purchase.name}</div>
                    <div className={styles.purchaseDate}>{formatDate(purchase.date)}</div>
                  </div>
                  <div className={styles.purchaseDetails}>
                    <div className={styles.purchaseQuantity}>{purchase.quantity} шт.</div>
                    <div className={styles.purchasePrice}>
                      {(purchase.price * purchase.quantity).toLocaleString()} ₽
                    </div>
                    <button 
                      className={`${styles.repeatButton} ${addedToCart[purchase.id] ? styles.repeatButtonSuccess : ''}`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(purchase);
                      }}
                    >
                      {addedToCart[purchase.id] ? 'Добавлено!' : 'Повторить'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyList}>У вас еще нет покупок</div>
            )}
          </div>
        )}
      </div> */}
    </div>
  );
};

export default ProfilePage; 