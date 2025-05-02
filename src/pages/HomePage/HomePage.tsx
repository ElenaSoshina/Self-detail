import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from '../../components/Hero/Hero';
import Pricing from '../../components/Pricing/Pricing';
import HowItWorks from '../../components/HowItWorks/HowItWorks';
import FAQ from '../../components/FAQ/FAQ';
import ProductPreviewSection from '../../components/ProductPreviewSection/ProductPreviewSection';


const HomePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
  
  return (
    <div>
      <Hero />
      <HowItWorks />
      <Pricing />
      <ProductPreviewSection />
      <FAQ />
    </div>
  );
};

export default HomePage;
