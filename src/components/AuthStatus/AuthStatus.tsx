import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getToken, isOfflineMode, setOfflineMode } from '../../api/apiService';
import './AuthStatus.css';

interface AuthStatusProps {
  className?: string;
}

const AuthStatus: React.FC<AuthStatusProps> = ({ className }) => {
  const { loading, error, isAuthenticated, token, retryAuth } = useAuth();
  const [showSuccessStatus, setShowSuccessStatus] = useState(false);
  const [isTelegramMode, setIsTelegramMode] = useState(false);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [offline, setOffline] = useState<boolean>(isOfflineMode());

  // Определяем при инициализации, работаем ли в Telegram WebApp
  useEffect(() => {
    setIsTelegramMode(!!(window as any).Telegram?.WebApp);
  }, []);

  useEffect(() => {
    // Проверяем ошибку и устанавливаем подробную информацию
    if (error) {
      setDetailedError(error.message);
    } else {
      setDetailedError(null);
    }
  }, [error]);

  useEffect(() => {
    // Проверка на успешную авторизацию
    if (isAuthenticated && token && !loading && !error) {
      setShowSuccessStatus(true);
      
      // Скрыть индикатор успеха через 3 секунды
      setTimeout(() => {
        setShowSuccessStatus(false);
      }, 3000);
    }
  }, [isAuthenticated, token, loading, error, isTelegramMode]);

  // Проверяем наличие токена при монтировании компонента
  useEffect(() => {
    const checkToken = () => {
      const token = getToken();
      setIsAuthorized(!!token);
      setOffline(isOfflineMode());
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

  // Обработчик переключения режима работы
  const toggleOfflineMode = () => {
    setOfflineMode(!offline);
    setOffline(!offline);
  };

  // Для Telegram WebApp всегда показываем индикатор
  if (isTelegramMode) {
    const status = loading ? 'loading' : error ? 'error' : isAuthenticated ? 'success' : '';
    const message = loading 
      ? 'Авторизация...' 
      : error 
        ? `Ошибка: ${error.message}` 
        : 'Авторизация выполнена успешно';
    
    // Если нет статуса или успешная авторизация скрыта - ничего не показываем
    if (!status || (status === 'success' && !showSuccessStatus)) {
      return null;
    }
    
    return (
      <div className={`auth-telegram-status ${status}`}>
        <div className="auth-telegram-content">
          {status === 'loading' && <div className="auth-telegram-spinner"></div>}
          {status === 'success' && <div className="auth-telegram-checkmark">✓</div>}
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

  if (showSuccessStatus) {
    return <div className="auth-success">Авторизация выполнена успешно</div>;
  }

  return (
    <div className={`auth-status ${className || ''}`}>
      <div className={`auth-indicator ${isAuthorized ? 'authorized' : 'unauthorized'}`}>
        {isAuthorized ? 'Авторизован' : 'Не авторизован'}
      </div>
      
      <div 
        className={`api-indicator ${offline ? 'offline' : 'online'}`}
        onClick={toggleOfflineMode}
        title="Нажмите для переключения режима API"
      >
        {offline ? 'Офлайн режим' : 'Онлайн режим'}
      </div>
    </div>
  );
};

export default AuthStatus; 