import './App.css'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Header } from './components/Header/Header'
import { CartProvider } from './context/CartContex';
import { AuthProvider } from './context/AuthContext';
import { AuthStatus } from './components/AuthStatus';
import HomePage from './pages/HomePage/HomePage';
import ProductsPage from './pages/ProductsPage/ProductsPage';
import CartPage from './pages/CartPage/CartPage';
import ProductPage from './pages/ProductPage/ProductPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import CalendarPage from './pages/CalendarPage/CalendarPage';
import AdminPanel from './pages/AdminPanel/AdminPanel';
import { isTelegramWebApp, initTelegramWebApp } from './utils/env';
import { useEffect } from 'react';

function App() {
  const location = useLocation();
  
  useEffect(() => {
    // Инициализация Telegram WebApp при загрузке
    if (isTelegramWebApp()) {
      initTelegramWebApp();
    }
  }, []);
  
  // Определяем, нужно ли показывать заголовок
  const showHeader = !isTelegramWebApp() || location.pathname === '/';

  return (
    <AuthProvider>
      <CartProvider>
        <div className="app">
          {showHeader && <Header />}
          <AuthStatus />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/admin/*" element={<AdminPanel />} />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App;