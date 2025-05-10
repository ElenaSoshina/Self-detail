import React, { useState } from 'react';
import { useCart } from '../../context/CartContex';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './CartPage.module.css';
import { products } from '../../data/products';
import defaultImage from '../../assets/shampoo.jpg';
import { CartItem } from '../../types';
import BookingModal from '../../components/BookingModal/BookingModal';
import { createBooking } from '../../api/booking';
import BookingSuccess from '../BookingSuccess/BookingSuccess';
import { BookingDetails } from '../CalendarPage/calendarTypes';

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
      alert(`Получены данные от модального окна: ${JSON.stringify(formData, null, 2)}`);
      
      // Получаем бронируемую услугу и товары
      const bookingItem = items.find(item => item.type === 'booking');
      const products = items.filter(item => item.type !== 'booking');
      
      console.log('Данные формы бронирования:', formData);
      console.log('Элемент бронирования в корзине:', bookingItem);
      console.log('Товары в корзине:', products);
      
      // Разбираем формат времени
      let startTime = formData.startTime || '';
      let endTime = formData.endTime || '';
      
      console.log('Исходные значения времени:', { startTime, endTime });
      
      // Ищем все числа формата ЧЧ:ММ
      let timePattern = '';
      if (startTime) {
        const timeMatches = startTime.match(/\d{1,2}:\d{2}/g);
        if (timeMatches && timeMatches.length >= 2) {
          timePattern = `${timeMatches[0]} - ${timeMatches[1]}`;
          console.log('Нормализованное время из startTime:', timePattern);
        } else if (startTime && endTime) {
          // Если у нас есть отдельные startTime и endTime
          timePattern = `${startTime} - ${endTime}`;
          console.log('Составленное время из startTime и endTime:', timePattern);
        } else {
          timePattern = startTime;
          console.log('Использование исходного времени:', timePattern);
        }
      }
      
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
      
      try {
        // Вызываем API для создания бронирования
        const response = await createBooking(formData);
        alert(`Успешный ответ от сервера: ${JSON.stringify(response, null, 2)}`);
      } catch (apiError) {
        alert(`Ошибка от API createBooking: ${apiError}`);
        throw apiError;
      }
      
      // После успешного запроса устанавливаем данные
      setSuccessBookingDetails(bookingDetails);
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
      alert(`Полная ошибка при бронировании: ${error}`);
      alert('Произошла ошибка при оформлении бронирования. Попробуйте еще раз.');
    }
  };

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
                  price: bookingItem.price
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
                serviceObj = {
                  serviceName: bookingData.serviceName,
                  price: totalCost
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