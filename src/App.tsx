import './App.css'
import { Routes, Route } from 'react-router-dom'

import { Header } from './components/Header/Header'
import { CartProvider } from './context/CartContex';
import HomePage from './pages/HomePage/HomePage';
import ProductsPage from './pages/ProductsPage/ProductsPage';

function App() {
  return (
    <CartProvider>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  )
}

export default App;