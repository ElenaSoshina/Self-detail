import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContex';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './CartPage.module.css';
import { products } from '../../data/products';
import defaultImage from '../../assets/shampoo.jpg';
import { CartItem } from '../../types';
import BookingModal from '../../components/BookingModal/BookingModal';
import BookingSuccess from '../BookingSuccess/BookingSuccess';
import { BookingDetails } from '../CalendarPage/calendarTypes';
import { sendTelegramMessage, formatAdminMessage, ADMIN_CHAT_ID, sendTelegramMessageToAllAdmins } from '../../api/telegram';
import api from '../../api/apiService';

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
      // Извлекаем время для запроса
      const timeMatches = formData.startTime.match(/\d{1,2}:\d{2}/g);
      if (!timeMatches || timeMatches.length === 0) {
        throw new Error('Некорректный формат времени');
      }
      
      // Определяем начальное и конечное время
      const startTimeFormatted = timeMatches[0];  // Первое найденное время
      const endTimeFormatted = timeMatches.length > 1 ? timeMatches[1] : startTimeFormatted;  // Второе время или первое, если второго нет

      // Гарантируем, что у нас есть валидный объект Date
      const selectedDateObj = formData.selectedDate instanceof Date 
        ? new Date(formData.selectedDate) 
        : new Date(formData.selectedDate);
        
      // Получаем данные напрямую
      const actualDay = selectedDateObj.getDate(); // Текущий день месяца (1-31)
      const actualMonth = selectedDateObj.getMonth() + 1; // Месяц (1-12)
      const actualYear = selectedDateObj.getFullYear(); // Год в 4-х значном формате

      // Форматируем с ведущими нулями
      const year = actualYear.toString();
      const month = actualMonth.toString().padStart(2, '0');
      const day = actualDay.toString().padStart(2, '0');

      const dateStr = `${year}-${month}-${day}`;
      
      // Создаем ISO строки для начала и конца бронирования
      const startISODate = `${dateStr}T${startTimeFormatted}:00`;
      const endISODate = `${dateStr}T${endTimeFormatted}:00`;
      
      // Вычисляем общую стоимость
      const bookingCost = formData.service?.price || 0;
      const productsTotal = items.reduce((sum, item) => sum + (item.type === 'product' ? item.price * item.quantity : 0), 0);
      const totalCost = bookingCost + productsTotal;
      
      // Создаем объект для BookingSuccess
      const bookingDetails: BookingDetails = {
        date: formData.selectedDate,
        timeRange: formData.startTime,
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
      
      // Формируем данные для API
      const chatId = '0';
      const apiData = {
        telegramUserId: chatId,
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
        notes: ''
      };
      
      // Отправляем запрос на API для создания бронирования
      const response = await api.post('/calendar/booking', apiData);
      
      // Получаем результат
      const result = response.data;
      
      // Отправляем сообщения в Telegram
      const isTech = (formData.service?.serviceName || '').toLowerCase().includes('техничес');
      
      console.log('📲 CartPage - Данные для отправки в Telegram:', {
        apiData: apiData,
        serviceData: formData.service || { price: 0 },
        serviceName: formData.service?.serviceName || '',
        isTech: isTech,
        timestamp: new Date().toISOString()
      });
      
      console.log('📤 CartPage - Начинаем отправку уведомлений администраторам...');
      
      try {
        // Отправляем сообщение всем администраторам
        await sendTelegramMessageToAllAdmins(
          formatAdminMessage(apiData, formData.service || { price: 0 }, formData.service?.serviceName || '')
        );
        console.log('✅ CartPage - Уведомления администраторам отправлены успешно');
      } catch (telegramError: any) {
        console.error('❌ CartPage - Ошибка при отправке уведомлений в Telegram:', {
          error: telegramError.message,
          stack: telegramError.stack
        });
        console.warn('⚠️ CartPage - Бронирование создано, но возникла проблема с уведомлениями');
      }
      
      // После успешного запроса устанавливаем данные
      setSuccessBookingDetails(bookingDetails);
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
    }
  };

  // Находим бронируемую услугу
  const bookingItem = items.find(item => item.type === 'booking');

  if (successBookingDetails) {
    return <BookingSuccess bookingDetails={successBookingDetails} />;
  }

  // if (items.length === 0) {
  //   return (
  //     <div className={styles.cartPage}>
  //       <h1 className={styles.pageTitle}>Корзина</h1>
  //       <div className={styles.cartPageContainer}>
  //         <p className={styles.emptyCartMsg}>Ваша корзина пуста</p>
  //         <Link to="/products" className={styles.goToCatalogBtn}>Перейти в каталог</Link>
  //       </div>
  //     </div>
  //   );
  // }

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
              } else if (bookingData) {
                // Если нет бронирования, но есть данные из location state
                const hourlyRate = 800; // Базовая ставка за час
                serviceObj = {
                  serviceName: bookingData.serviceName,
                  price: hourlyRate // Передаем цену за час, не умноженную на количество часов
                };
                startTimeStr = bookingData.startTime;
                endTimeStr = bookingData.endTime;
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
          // duration намеренно не передается - BookingModal использует fallback логику
          service={selectedService}
          onSubmit={handleBooking}
          selectedDate={bookingData?.selectedDate}
          isAdmin={false}
          startTimeContext={undefined}
          endTimeContext={undefined}
        />
      )}
    </div>
  );
};

export default CartPage; 