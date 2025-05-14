import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthStatus.css';

export const AuthStatus: React.FC = () => {
  const { loading, error, isAuthenticated, token } = useAuth();
  const [showSuccessStatus, setShowSuccessStatus] = useState(false);
  const [isTelegramMode, setIsTelegramMode] = useState(false);

  // Определяем при инициализации, работаем ли в Telegram WebApp
  useEffect(() => {
    setIsTelegramMode(!!(window as any).Telegram?.WebApp);
  }, []);

  useEffect(() => {
    // Проверка на успешную авторизацию
    if (isAuthenticated && token && !loading && !error) {
      // Для локальной разработки показываем алерт
      if (import.meta.env.DEV && !isTelegramMode) {
        alert(`Авторизация прошла успешно!\nТокен: ${token.substring(0, 20)}...`);
      }
      
      setShowSuccessStatus(true);
      
      // Скрыть индикатор успеха через 3 секунды
      setTimeout(() => {
        setShowSuccessStatus(false);
      }, 3000);
    }
  }, [isAuthenticated, token, loading, error, isTelegramMode]);

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
          {status === 'error' && (
            <button 
              className="auth-telegram-retry" 
              onClick={() => window.location.reload()}
            >
              Обновить
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
    return <div className="auth-error">Ошибка авторизации: {error.message}</div>;
  }

  if (showSuccessStatus) {
    return <div className="auth-success">Авторизация выполнена успешно</div>;
  }

  return null;
}; 