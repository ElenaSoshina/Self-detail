import { useNavigate } from 'react-router-dom';
import styles from './ProductsPage.module.css';


interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

export default function ProductsPage() {
  const navigate = useNavigate();
  
  const handleProductClick = (id: number) => {
    navigate(`/product/${id}`);
  };

  return (
    <div className={styles.productsPage}>
      {products.map((product: Product) => (
        <div 
          key={product.id} 
          className={styles.productCard}
          onClick={() => handleProductClick(product.id)}
        >
          <img src={product.image} alt={product.name} className={styles.productImage} />
          <h3 className={styles.productName}>{product.name}</h3>
          <p className={styles.productPrice}>{product.price} ₽</p>
        </div>
      ))}
    </div>
  );
} 