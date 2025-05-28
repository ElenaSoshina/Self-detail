import React, { useState, useEffect } from 'react';
import styles from './ProfilePage.module.css';
import { useCart } from '../../context/CartContex';
import BookingDetails from '../AdminPanel/BookingDetails';
import { formatDate } from '../../utils/dateUtils';
import api from '../../api/apiService';

interface UserInfo {
  username: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  telegramUserId?: number; // Добавляем ID пользователя Telegram
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

interface ApiBooking {
  bookingId: number;
  telegramUserId: number;
  telegramUserName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  start: string;
  end: string;
  services: Array<{
    id: number;
    serviceName: string;
    price: number;
  }>;
  notes: string;
}

interface Purchase {
  id: string;
  name: string;
  price: number;
  date: string;
  imageUrl: string;
  quantity: number;
}

// Функция для расчета скидки на основе количества часов
const calculateDiscount = (hours: number): number => {
  if (hours < 10) return 0;
  if (hours < 20) return 10;
  if (hours < 30) return 20;
  if (hours < 40) return 30;
  if (hours < 50) return 40;
  return 50; // Максимальная скидка
};

// Функция для получения следующего порога скидки
const calculateNextDiscountThreshold = (hours: number): number => {
  if (hours < 10) return 10;
  if (hours < 20) return 20;
  if (hours < 30) return 30;
  if (hours < 40) return 40;
  if (hours < 50) return 50;
  return 50; // Максимальная скидка уже достигнута
};

// Функция для проверки межсуточного бронирования
const isCrossingDays = (start: string, end: string): boolean => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return startDate.toDateString() !== endDate.toDateString();
};

// Функция для форматирования отображения времени с учетом межсуточности
const formatBookingTimeDisplay = (booking: Booking) => {
  const startDate = new Date(booking.date);
  const endDate = new Date(booking.date);
  
  // Парсим время начала и конца
  const [startHour, startMinute] = booking.timeStart.split(':').map(Number);
  const [endHour, endMinute] = booking.timeEnd.split(':').map(Number);
  
  // Устанавливаем время
  startDate.setHours(startHour, startMinute, 0, 0);
  endDate.setHours(endHour, endMinute, 0, 0);
  
  // Если время окончания меньше времени начала, значит бронирование переходит на следующий день
  if (endDate.getTime() <= startDate.getTime()) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };
  
  const crossing = startDate.toDateString() !== endDate.toDateString();
  
  if (crossing) {
    // Межсуточное бронирование
    return {
      dateDisplay: `${formatDateShort(startDate)} — ${formatDateShort(endDate)}`,
      timeDisplay: `${booking.timeStart} — ${booking.timeEnd}`,
      isCrossing: true
    };
  } else {
    // Обычное бронирование
    return {
      dateDisplay: formatDate(booking.date),
      timeDisplay: `${booking.timeStart} — ${booking.timeEnd}`,
      isCrossing: false
    };
  }
};

const ProfilePage: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showBookings, setShowBookings] = useState(true);
  const [showPurchases, setShowPurchases] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [nextDiscountThreshold, setNextDiscountThreshold] = useState(0);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    // Загружаем данные пользователя и бронирования
    const fetchUserData = () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user) {
          const { username, first_name, last_name, photo_url, id } = tg.initDataUnsafe.user;
          setUserInfo({
            username: username || first_name?.toLowerCase() || 'user',
            firstName: first_name || '',
            lastName: last_name || '',
            photoUrl: photo_url || null,
            telegramUserId: id, // Сохраняем ID пользователя Telegram
          });
          
          // Если получили telegramUserId, загружаем бронирования
          if (id) {
            fetchUserBookings(id);
          }
        } else {
          // Тестовые данные для разработки
          const testUserId = 522814078; // Тестовый ID из примера
          setUserInfo({
            username: 'test',
            firstName: 'Тестовый',
            lastName: 'Пользователь',
            photoUrl: null,
            telegramUserId: testUserId,
          });
          
          // Загружаем бронирования для тестового пользователя
          fetchUserBookings(testUserId);
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        setIsLoading(false);
        setBookingsError('Не удалось загрузить данные пользователя');
      }
    };

    fetchUserData();
  }, []);

  // Получение бронирований пользователя по API
  const fetchUserBookings = async (telegramUserId: number) => {
    try {
      setIsLoading(true);
      setBookingsError(null);
      
      const response = await api.get(`/calendar/user/${telegramUserId}/bookings`);
      
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.errorMessage || 'Ошибка при получении данных');
      }
      
      // Преобразуем данные из API в нужный формат
      const formattedBookings = data.data.bookings.map((booking: ApiBooking) => {
        // Подсчет продолжительности в часах
        const startTime = new Date(booking.start);
        const endTime = new Date(booking.end);
        const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        // Получаем время в формате HH:MM
        const startTimeStr = startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Определение стоимости и названия услуги
        const serviceName = booking.services && booking.services.length > 0 
          ? booking.services[0].serviceName 
          : 'Услуга';
          
        const cost = booking.services && booking.services.length > 0 
          ? booking.services[0].price 
          : 0;
          
        return {
          id: String(booking.bookingId),
          date: booking.start,
          timeStart: startTimeStr,
          timeEnd: endTimeStr,
          service: serviceName,
          cost: cost,
          durationHours: Math.round(diffHours * 10) / 10, // Округляем до 1 знака после запятой
        };
      });
      
      // Сортируем бронирования по дате (сначала самые новые)
      formattedBookings.sort((a: Booking, b: Booking) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setBookings(formattedBookings);
      
      // Рассчитываем общее количество часов для скидки
      const totalBookingHours = formattedBookings.reduce((sum: number, booking: Booking) => sum + booking.durationHours, 0);
      setTotalHours(totalBookingHours);
      
      // Рассчитываем скидку на основе часов
      const discountPercent = calculateDiscount(totalBookingHours);
      setDiscount(discountPercent);
      
      // Рассчитываем порог следующей скидки
      const nextThreshold = calculateNextDiscountThreshold(totalBookingHours);
      setNextDiscountThreshold(nextThreshold);
    } catch (error) {
      console.error('Ошибка при загрузке бронирований:', error);
      setBookingsError('Не удалось загрузить бронирования');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик клика по бронированию
  const handleBookingClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setShowBookingDetails(true);
  };

  // Обработчик закрытия модального окна
  const handleCloseBookingDetails = () => {
    setShowBookingDetails(false);
    setSelectedBookingId(null);
  };

  // Функция для удаления бронирования
  const deleteBooking = async (bookingId: number | string) => {
    try {
      const response = await api.delete(`/calendar/booking/${bookingId}`);

      const data = response.data;
      
      if (!data || !data.success) {
        throw new Error(data.errorMessage || 'Ошибка при удалении бронирования');
      }
      
      setDeleteSuccess(true);
      
      // Закрываем модальное окно и обновляем список бронирований
      setTimeout(() => {
        setDeleteSuccess(false);
        handleCloseBookingDetails();
        
        // Обновляем список бронирований, если есть ID пользователя
        if (userInfo?.telegramUserId) {
          fetchUserBookings(userInfo.telegramUserId);
        }
      }, 2000);
      
      return true;
    } catch (error: any) {
      console.error('Ошибка при удалении бронирования:', error);
      return false;
    }
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
      
      {/* <div className={styles.bookingProgress}>
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
      </div> */}

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
            {bookingsError ? (
              <div className={styles.error}>{bookingsError}</div>
            ) : bookings.length > 0 ? (
              bookings.map(booking => (
                <div 
                  key={booking.id} 
                  className={styles.bookingItem}
                  onClick={() => handleBookingClick(booking.id)}
                >
                  <div className={styles.bookingDate}>
                    {(() => {
                      const timeInfo = formatBookingTimeDisplay(booking);
                      return (
                        <>
                          <div className={`${styles.date} ${timeInfo.isCrossing ? styles.crossingDate : ''}`}>
                            {timeInfo.isCrossing && <span className={styles.crossingIcon}>↪️ </span>}
                            {timeInfo.dateDisplay}
                            {timeInfo.isCrossing && <span className={styles.crossingIcon}> ↩️</span>}
                          </div>
                          <div className={styles.time}>{timeInfo.timeDisplay}</div>
                        </>
                      );
                    })()}
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

      {/* Модальное окно с деталями бронирования */}
      {showBookingDetails && selectedBookingId && (
        <div 
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseBookingDetails();
            }
          }}
        >
          <div className={styles.modalContent}>
            <BookingDetails 
              bookingId={selectedBookingId} 
              onClose={handleCloseBookingDetails}
              onEdit={(bookingId) => {
                // Здесь будет логика редактирования бронирования
              }}
              onCancel={(bookingId) => {
                if (window.confirm(`Вы уверены, что хотите отменить бронирование #${bookingId}?`)) {
                  deleteBooking(bookingId);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Сообщение об успешном удалении */}
      {deleteSuccess && (
        <div className={styles.successPopup}>
          <div className={styles.successPopupContent}>
            <div className={styles.successIcon}>✓</div>
            <p>Бронирование успешно удалено</p>
          </div>
        </div>
      )}

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