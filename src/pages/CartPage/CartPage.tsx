import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './CartPage.module.css';
import { useCart } from '../../context/CartContex';
import { products } from '../../data/products';
import image from '../../assets/shampoo.jpg';

const CartPage: React.FC = () => {
  const { items, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  
  // Расчет общей стоимости корзины
  const totalSum = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Функция получения изображения товара (по ID)
  const getProductImage = (productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    return product?.image || image;
  };
  
  // Форматирование цены с разделителем тысяч
  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };
  
  // Обработчики для изменения количества и удаления товара
  const handleDecreaseQuantity = (id: string) => {
    const item = items.find(item => item.id === id);
    if (item && item.quantity > 1) {
      updateQuantity(id, item.quantity - 1);
    } else if (item && item.quantity === 1) {
      // При уменьшении до 0, спрашиваем о удалении
      if (window.confirm('Удалить товар из корзины?')) {
        removeFromCart(id);
      }
    }
  };
  
  const handleIncreaseQuantity = (id: string) => {
    const item = items.find(item => item.id === id);
    if (item) {
      updateQuantity(id, item.quantity + 1);
    }
  };
  
  const handleRemove = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар из корзины?')) {
      removeFromCart(id);
    }
  };
  
  const handleProductClick = (id: string) => {
    navigate(`/product/${id}`);
  };
  
  // Отображаем пустую корзину, если товаров нет
  if (items.length === 0) {
    return (
      <div className={styles.cartPageContainer}>
        <div className={styles.emptyCartMsg}>В корзине ничего нет</div>
        <Link to="/products" className={styles.goToCatalogBtn}>Перейти в каталог</Link>
      </div>
    );
  }
  
  // Отображаем товары в корзине
  return (
    <div className={styles.cartPage}>
      <h1 className={styles.pageTitle}>Корзина</h1>
      
      <div className={styles.cartContainer}>
        <div className={styles.cartItems}>
          {items.map(item => (
            <div key={item.id} className={styles.cartItem}>
              <div className={styles.itemImage} onClick={() => handleProductClick(item.id)}>
                <img src={getProductImage(item.id)} alt={item.name} />
              </div>
              
              <div className={styles.itemInfo} onClick={() => handleProductClick(item.id)}>
                <h3 className={styles.itemName}>{item.name}</h3>
                <div className={styles.itemPrice}>{formatPrice(item.price)} ₽</div>
              </div>
              
              <div className={styles.itemControls}>
                <div className={styles.quantityControls}>
                  <button 
                    className={styles.quantityBtn}
                    onClick={() => handleDecreaseQuantity(item.id)}
                  >
                    -
                  </button>
                  <span className={styles.quantity}>{item.quantity}</span>
                  <button 
                    className={styles.quantityBtn}
                    onClick={() => handleIncreaseQuantity(item.id)}
                  >
                    +
                  </button>
                </div>
                
                <div className={styles.itemTotal}>
                  {formatPrice(item.price * item.quantity)} ₽
                </div>
                
                <button 
                  className={styles.removeBtn} 
                  onClick={() => handleRemove(item.id)}
                  aria-label="Удалить товар"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className={styles.cartSummary}>
          <div className={styles.summaryRow}>
            <span>Всего товаров:</span>
            <span>{items.reduce((count, item) => count + item.quantity, 0)} шт.</span>
          </div>
          
          <div className={styles.summaryRow}>
            <span>Итого:</span>
            <span className={styles.totalPrice}>{formatPrice(totalSum)} ₽</span>
          </div>
          
          <button className={styles.checkoutBtn}>
            Оформить заказ
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage; 