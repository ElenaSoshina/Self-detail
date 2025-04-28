import React, { createContext, useContext, useState } from 'react';
import { Item } from '../types/item';
import { CartItem } from '../types';

interface CartContextType {
  items: Item[];
  addToCart: (item: Omit<Item, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<Item, 'quantity'>) => {
    // setItems(prevItems => {
    //   const existingItem = prevItems.find(i => i.id === item.id);
    //   if (existingItem) {
    //     return prevItems.map(i =>
    //       i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
    //     );
    //   }
    //   return [...prevItems, { ...item, quantity: 1 }];
    // });
  };

  const removeFromCart = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(id);
      return;
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}; 