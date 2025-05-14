import './App.css'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header/Header'
import { CartProvider } from './context/CartContex';
import { AuthProvider } from './context/AuthContext';
import { AuthStatus } from './components/AuthStatus/AuthStatus';
import HomePage from './pages/HomePage/HomePage';
import ProductsPage from './pages/ProductsPage/ProductsPage';
import CartPage from './pages/CartPage/CartPage';
import ProductPage from './pages/ProductPage/ProductPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import CalendarPage from './pages/CalendarPage/CalendarPage';
import AdminPanel from './pages/AdminPanel/AdminPanel';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="app">
          <Header />
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