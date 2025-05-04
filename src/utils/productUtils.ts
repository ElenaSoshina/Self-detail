import { products } from '../data/products';
import defaultImage from '../assets/shampoo.jpg';

// Функция для получения изображения продукта по ID
export const getProductImage = (id: string | number): string => {
  const productId = typeof id === 'string' ? parseInt(id) : id;
  const product = products.find(p => p.id === productId);
  return product?.image || defaultImage;
};

// Форматирование цены с разделителем тысяч
export const formatPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}; 