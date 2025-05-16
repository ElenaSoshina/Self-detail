import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getToken } from '../../api/apiService';
import './AuthStatus.css';
import { isTelegramWebApp } from '../../utils/env';

interface AuthStatusProps {
  className?: string;
}

const AuthStatus: React.FC<AuthStatusProps> = ({ className }) => {
  const { loading, error, isAuthenticated, token, retryAuth } = useAuth();
  const [showSuccessStatus, setShowSuccessStatus] = useState(false);
  const [isTelegramMode, setIsTelegramMode] = useState(false);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  // Определяем при инициализации, работаем ли в Telegram WebApp
  useEffect(() => {
    setIsTelegramMode(isTelegramWebApp());
  }, []);

  useEffect(() => {
    // Проверяем ошибку и устанавливаем подробную информацию
    if (error) {
      setDetailedError(error.message);
    } else {
      setDetailedError(null);
    }
  }, [error]);

  // Проверяем наличие токена при монтировании компонента
  useEffect(() => {
    const checkToken = () => {
      const token = getToken();
      setIsAuthorized(!!token);
    };
    
    // Проверяем статус при монтировании
    checkToken();
    
    // Запускаем периодическую проверку
    const intervalId = setInterval(checkToken, 5000);
    
    // Очистка интервала при размонтировании
    return () => clearInterval(intervalId);
  }, []);

  const handleRetry = async () => {
    await retryAuth();
  };

  // Для Telegram WebApp всегда показываем индикатор
  if (isTelegramMode) {
    const status = loading ? 'loading' : error ? 'error' : '';
    const message = loading 
      ? 'Авторизация...' 
      : error 
        ? `Ошибка: ${error.message}` 
        : '';
    
    // Показываем только загрузку или ошибку
    if (!status) {
      return null;
    }
    
    return (
      <div className={`auth-telegram-status ${status}`}>
        <div className="auth-telegram-content">
          {status === 'loading' && <div className="auth-telegram-spinner"></div>}
          {status === 'error' && <div className="auth-telegram-error-icon">!</div>}
          <span>{message}</span>
          {status === 'error' && detailedError && (
            <div className="auth-telegram-error-details">{detailedError}</div>
          )}
          {status === 'error' && (
            <button 
              className="auth-telegram-retry" 
              onClick={handleRetry}
            >
              Повторить
            </button>
          )}
        </div>
      </div>
    );
  }

  // Стандартный вариант для браузера
  if (loading) {
    return <div className="auth-loading">Выполняется авторизация...</div>;
  }

  if (error) {
    return (
      <div className="auth-error">
        <div>Ошибка авторизации: {error.message}</div>
        {detailedError && <div className="auth-error-details">{detailedError}</div>}
        <button 
          className="auth-retry-button" 
          onClick={handleRetry}
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className={`auth-status ${className || ''}`}>
      <div className={`auth-indicator ${isAuthorized ? 'authorized' : 'unauthorized'}`}>
        {isAuthorized ? 'Авторизован' : 'Не авторизован'}
      </div>
    </div>
  );
};

export default AuthStatus; 