import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from '../../components/Hero/Hero';
import Pricing from '../../components/Pricing/Pricing';
import HowItWorks from '../../components/HowItWorks/HowItWorks';
import FAQ from '../../components/FAQ/FAQ';
import ProductPreviewSection from '../../components/ProductPreviewSection/ProductPreviewSection';

const ADMIN_IDS = ['522814078']; // сюда можно добавить других админов

const HomePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      const id = tg.initDataUnsafe.user.id.toString();
      setTelegramId(id);
      setIsAdmin(ADMIN_IDS.includes(id));
      tg.ready?.();
    }
  }, []);

  useEffect(() => {
    const sectionId = location.state?.scrollTo;
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el) {
        const headerOffset = 80;
        const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }, [location.state]);
  
  const handleBookClick = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGoAdmin = () => {
    navigate('/admin');
  };
  const handleGoHome = () => {
    navigate('/');
  };
  
  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 16, margin: '16px 0' }}>
          <button onClick={handleGoAdmin}>Перейти в админку</button>
          <button onClick={handleGoHome}>Перейти на главную</button>
        </div>
      )}
      <Hero />
      <HowItWorks />
      <Pricing />
      <ProductPreviewSection />
      <FAQ />
    </div>
  );
};

export default HomePage;
