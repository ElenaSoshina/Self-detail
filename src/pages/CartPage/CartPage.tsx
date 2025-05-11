import React, { useState } from 'react';
import { useCart } from '../../context/CartContex';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './CartPage.module.css';
import { products } from '../../data/products';
import defaultImage from '../../assets/shampoo.jpg';
import { CartItem } from '../../types';
import BookingModal from '../../components/BookingModal/BookingModal';
import BookingSuccess from '../BookingSuccess/BookingSuccess';
import { BookingDetails } from '../CalendarPage/calendarTypes';
import { sendTelegramMessage, formatAdminMessage, ADMIN_CHAT_ID } from '../../api/telegram';

// Функция для получения изображения продукта по ID
const getProductImage = (id: string | number): string => {
  const productId = typeof id === 'string' ? parseInt(id as string) : id;
  const product = products.find(p => p.id === productId);
  return product?.image || defaultImage;
};

const CartPage: React.FC = () => {
  const { items, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<{ start: string; end: string } | null>(null);
  const [selectedService, setSelectedService] = useState<{ serviceName: string; price: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successBookingDetails, setSuccessBookingDetails] = useState<BookingDetails | null>(null);

  // Получаем данные из location state
  const bookingData = location.state?.bookingData;

  const handleProductClick = (productId: string) => {
    // Переходим на страницу товара только если это не бронирование
    const item = items.find(item => item.id === productId);
    if (item && item.type !== 'booking') {
      navigate(`/product/${productId}`);
    }
  };

  const handleUpdateQuantity = (itemId: string, delta: number, currentQuantity: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  // Расчет общей стоимости корзины
  const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleBooking = async (formData: any) => {
    try {
      alert('Создание бронирования');
      
      // Извлекаем время
      let timePattern = '';
      if (formData.startTime && formData.endTime) {
        timePattern = `${formData.startTime} - ${formData.endTime}`;
      } else if (formData.startTime) {
        timePattern = formData.startTime;
      }
      
      // Вычисляем общую стоимость
      const bookingCost = formData.service?.price || 0;
      const productsTotal = items.reduce((sum, item) => sum + (item.type === 'product' ? item.price * item.quantity : 0), 0);
      const totalCost = bookingCost + productsTotal;
      
      // Создаем объект для BookingSuccess
      const bookingDetails: BookingDetails = {
        date: formData.selectedDate,
        timeRange: timePattern,
        duration: 1, // или вычисли из времени
        plan: {
          id: bookingItem?.id || 'custom',
          title: formData.service?.serviceName || 'Товары',
          price: formData.service?.price || 0,
          icon: bookingItem?.icon || '',
          description: ''
        },
        totalPrice: totalCost
      };
      
      console.log('Отправка данных бронирования:', formData);
      console.log('Объект bookingDetails:', bookingDetails);
      
      // Разбираем времена начала и окончания
      const parseTimeValue = (timeStr: string, type: 'start' | 'end'): string => {
        try {
          if (!timeStr) return '';
          
          // Используем регулярные выражения для извлечения всех времен в формате HH:MM
          const timeMatches = timeStr.match(/\d{1,2}:\d{2}/g);
          
          if (!timeMatches || timeMatches.length === 0) {
            return '';
          }
          
          // Если нашли два времени, берем первое для начала, второе для конца
          if (timeMatches.length >= 2) {
            return type === 'start' ? timeMatches[0] : timeMatches[1];
          }
          
          // Если нашли только одно время, используем его для обоих случаев
          return timeMatches[0];
        } catch (error) {
          console.error(`Ошибка при парсинге времени:`, error);
          return '';
        }
      };
      
      // Создание ISO строки даты с указанным временем с учетом локального часового пояса
      const createDateWithTime = (baseDate: Date, timeStr: string): string => {
        try {
          if (!timeStr.match(/^\d{1,2}:\d{2}$/)) {
            throw new Error(`Неверный формат времени: ${timeStr}`);
          }
          
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error(`Неверное значение времени: ${hours}:${minutes}`);
          }
          
          // Получаем год, месяц и день из базовой даты
          const year = baseDate.getFullYear();
          const month = baseDate.getMonth() + 1; // +1 потому что месяцы начинаются с 0
          const day = baseDate.getDate();
          
          // Форматируем дату в ISO строку без конвертации в UTC
          // Используем формат YYYY-MM-DDTHH:MM:SS
          const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          
          return isoDate;
        } catch (error) {
          console.error(`Ошибка при создании даты:`, error);
          throw error;
        }
      };
      
      const startTimeStr = parseTimeValue(formData.startTime, 'start');
      const endTimeStr = parseTimeValue(formData.endTime || formData.startTime, 'end');
      
      if (!startTimeStr || !endTimeStr) {
        throw new Error('Некорректный формат времени');
      }
      
      // Создаем корректные даты ISO для API
      const startISODate = createDateWithTime(formData.selectedDate, startTimeStr);
      const endISODate = createDateWithTime(formData.selectedDate, endTimeStr);
      
      // Формируем данные для API
      const chatId = '0';
      const apiData = {
        telegramUserId: parseInt(chatId || '0'),
        telegramUserName: formData.telegramUserName?.startsWith('@') 
          ? formData.telegramUserName 
          : `@${formData.telegramUserName || ''}`,
        clientName: formData.name || '',
        clientPhone: (formData.phone || '').replace(/\+/g, ''),
        clientEmail: formData.email || '',
        start: startISODate,
        end: endISODate,
        service: formData.service 
          ? [{
              serviceName: formData.service.serviceName || '',
              price: formData.service.price || 0
            }]
          : [],
        notes: '',
        products: items
          .filter(item => item.type === 'product')
          .map(item => ({
            productName: item.name,
            price: item.price,
            quantity: item.quantity
          }))
      };
      
      // Отправляем запрос на API для создания бронирования
      const response = await fetch('https://backend.self-detailing.duckdns.org/api/v1/calendar/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        alert('Ошибка сервера: ' + errorText);
        throw new Error(`Ошибка сервера: ${response.status} ${errorText}`);
      }
      
      // Получаем результат
      const result = await response.json();
      alert('Бронирование успешно создано');
      
      // Отправляем сообщения в Telegram
      const isTech = (formData.service?.serviceName || '').toLowerCase().includes('техничес');
      
      try {
        // Обычный пользователь — отправляем админу
        await sendTelegramMessage(
          formatAdminMessage(apiData, formData.service || { price: 0 }, formData.service?.serviceName || ''),
          ADMIN_CHAT_ID
        );

        alert('Уведомления в Telegram отправлены');
      } catch (telegramError) {
        console.error('Ошибка при отправке уведомлений в Telegram:', telegramError);
      }
      
      // После успешного запроса устанавливаем данные
      setSuccessBookingDetails(bookingDetails);
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
      alert(`Ошибка при бронировании: ${error}`);
    }
  };

  // Находим бронируемую услугу
  const bookingItem = items.find(item => item.type === 'booking');

  if (successBookingDetails) {
    return <BookingSuccess bookingDetails={successBookingDetails} />;
  }

  if (items.length === 0) {
    return (
      <div className={styles.cartPage}>
        <h1 className={styles.pageTitle}>Корзина</h1>
        <div className={styles.cartPageContainer}>
          <p className={styles.emptyCartMsg}>Ваша корзина пуста</p>
          <Link to="/products" className={styles.goToCatalogBtn}>Перейти в каталог</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cartPage}>
      <h1 className={styles.pageTitle}>Корзина</h1>
      <div className={styles.cartContainer}>
        <div className={styles.cartItems}>
          {items.map((item: CartItem) => (
            <div key={item.id} className={styles.cartItem}>
              <div 
                className={`${styles.itemImage} ${item.type === 'booking' ? styles.bookingImage : ''}`} 
                onClick={() => handleProductClick(item.id)}
              >
                {item.type === 'booking' && item.icon ? (
                  <div className={styles.bookingIcon} dangerouslySetInnerHTML={{ __html: item.icon }} />
                ) : (
                  <img src={getProductImage(item.id)} alt={item.name} />
                )}
              </div>
              <div className={styles.itemInfo} onClick={() => handleProductClick(item.id)}>
                <h3 className={styles.itemName}>{item.name}</h3>
                {/* {item.details && <div className={styles.itemDetails}>{item.details}</div>} */}
                {/* <div className={styles.itemPrice}>{item.price} ₽</div> */}
              </div>
              <div className={styles.itemControls}>
                <div className={styles.quantityControls}>
                  <button 
                    className={styles.quantityBtn} 
                    onClick={() => handleUpdateQuantity(item.id, -1, item.quantity)}
                  >
                    -
                  </button>
                  <span className={styles.quantity}>{item.quantity}</span>
                  <button 
                    className={styles.quantityBtn} 
                    onClick={() => handleUpdateQuantity(item.id, 1, item.quantity)}
                  >
                    +
                  </button>
                </div>
                <div className={styles.itemTotal}>{item.price * item.quantity} ₽</div>
                <button 
                  className={styles.removeBtn} 
                  onClick={() => removeFromCart(item.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.cartSummary}>
          <div className={styles.summaryRow}>
            <span>Сумма заказа:</span>
            <span>{totalCost} ₽</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Скидка:</span>
            <span>0 ₽</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Итого:</span>
            <span className={styles.totalPrice}>{totalCost} ₽</span>
          </div>
          <button 
            onClick={async () => {
              // Находим booking item в корзине
              const bookingItem = items.find(item => item.type === 'booking');
              
              // Подготавливаем время для передачи в модальное окно
              let startTimeStr = '';
              let endTimeStr = '';
              
              // Подготавливаем service для модального окна
              let serviceObj = null;
              
              if (bookingItem) {
                // Если есть бронирование в корзине
                serviceObj = {
                  serviceName: bookingItem.name.split('(')[0].trim(),
                  price: bookingItem.price // Цена за час, не умноженная на количество часов
                };
                
                // И получаем время, если оно есть
                if (bookingItem.details) {
                  const timeRange = bookingItem.details.split('|')[1]?.trim();
                  if (timeRange) {
                    if (timeRange.includes('-')) {
                      // Если время в формате "XX:XX - YY:YY"
                      const [start, end] = timeRange.split('-').map(t => t.trim());
                      startTimeStr = start;
                      endTimeStr = end;
                    } else {
                      // Просто строка с временем
                      startTimeStr = timeRange;
                      endTimeStr = timeRange;
                    }
                  }
                }
                
                console.log('Передача в модальное окно:', {
                  bookingItem,
                  serviceObj,
                  startTime: startTimeStr,
                  endTime: endTimeStr
                });
              } else if (bookingData) {
                // Если нет бронирования, но есть данные из location state
                const hourlyRate = 800; // Базовая ставка за час
                serviceObj = {
                  serviceName: bookingData.serviceName,
                  price: hourlyRate // Передаем цену за час, не умноженную на количество часов
                };
                startTimeStr = bookingData.startTime;
                endTimeStr = bookingData.endTime;
                
                console.log('Передача в модальное окно из bookingData:', {
                  bookingData,
                  serviceObj,
                  startTime: startTimeStr,
                  endTime: endTimeStr
                });
              }
              
              // Устанавливаем время и сервис для модального окна
              setSelectedTime({ 
                start: startTimeStr, 
                end: endTimeStr || startTimeStr 
              });
              
              setSelectedService(serviceObj);
              
              // Открываем модальное окно
              setIsModalOpen(true);
            }}
            className={styles.bookButton}
          >
            Забронировать
          </button>
        </div>
      </div>
      {!showSuccess && isModalOpen && selectedTime && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          startTime={selectedTime.start}
          endTime={selectedTime.end}
          service={selectedService}
          onSubmit={handleBooking}
          selectedDate={bookingData?.selectedDate || new Date()}
          isAdmin={false}
        />
      )}
    </div>
  );
};

export default CartPage; 