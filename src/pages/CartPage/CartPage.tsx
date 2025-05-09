import React, { useState } from 'react';
import { useCart } from '../../context/CartContex';
import { Link, useNavigate } from 'react-router-dom';
import styles from './CartPage.module.css';
import { products } from '../../data/products';
import defaultImage from '../../assets/shampoo.jpg';
import { CartItem } from '../../types';
import BookingModal from '../../components/BookingModal/BookingModal';
import { createBooking } from '../../api/booking';

// Функция для получения изображения продукта по ID
const getProductImage = (id: string | number): string => {
  const productId = typeof id === 'string' ? parseInt(id as string) : id;
  const product = products.find(p => p.id === productId);
  return product?.image || defaultImage;
};

const CartPage: React.FC = () => {
  const { items, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<{ start: string; end: string } | null>(null);
  const [selectedService, setSelectedService] = useState<{ serviceName: string; price: number } | null>(null);

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
      await createBooking(formData);
      navigate('/booking-success');
    } catch (error) {
      console.error('Ошибка при бронировании:', error);
    }
  };

  if (items.length === 0) {
    return (
      <div className={styles.cartPage}>
        <h1 className={styles.pageTitle}>Корзина</h1>
        <div className={styles.cartPageContainer}>
          <p className={styles.emptyCartMsg}>Ваша корзина пуста</p>
          <Link to="/catalog" className={styles.goToCatalogBtn}>Перейти в каталог</Link>
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
                <div className={styles.itemPrice}>{item.price} ₽</div>
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
            onClick={() => setIsModalOpen(true)}
            className={styles.bookButton}
          >
            Забронировать
          </button>
        </div>
      </div>

      {isModalOpen && selectedTime && selectedService && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          startTime={selectedTime.start}
          endTime={selectedTime.end}
          service={selectedService}
          onSubmit={handleBooking}
        />
      )}
    </div>
  );
};

export default CartPage; 