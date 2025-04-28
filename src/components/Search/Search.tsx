import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
import styles from './Search.module.css';

interface SearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Product {
  id: number;
  name: string;
  price: number;
  img: string;
}

const products: Product[] = [
  { id: 1, name: 'Автошампунь', price: 350, img: '/img/shampoo.jpg' },
  { id: 2, name: 'Губка для мойки', price: 120, img: '/img/sponge.jpg' },
  { id: 3, name: 'Средство для химчистки', price: 490, img: '/img/cleaner.jpg' },
  { id: 4, name: 'Микрофибра', price: 200, img: '/img/microfiber.jpg' },
  { id: 5, name: 'Полироль для пластика', price: 310, img: '/img/polish.jpg' },
];

export const Search: React.FC<SearchProps> = ({ isOpen, onClose }) => {
//   const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filtered);
  }, [searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={`${styles.searchContainer} ${isOpen ? styles.active : ''}`} ref={searchRef}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Поиск товаров..."
        value={searchQuery}
        onChange={handleSearch}
        autoFocus={isOpen}
      />
      {searchQuery.trim() !== '' && (
        <div className={styles.searchResults}>
          {searchResults.length > 0 ? (
            searchResults.map((item) => (
              <div key={item.id} className={styles.searchItem}>
                <span className={styles.gameName}>{item.name}</span>
                <span className={styles.price}>{item.price} ₽</span>
              </div>
            ))
          ) : (
            <div className={styles.noResults}>
              <span>Ничего не найдено</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 