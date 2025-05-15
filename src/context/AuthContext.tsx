import React, { createContext, useContext, useEffect, useState } from 'react';
import { login, getToken, resetToken } from '../api/apiService';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  error: Error | null;
  retryAuth: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  loading: true,
  error: null,
  retryAuth: async () => {},
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const authenticate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Проверяем есть ли уже токен
      const currentToken = getToken();
      if (currentToken) {
        setToken(currentToken);
        setLoading(false);
        return;
      }
      
      // Если нет, получаем новый
      const newToken = await login();
      setToken(newToken);
    } catch (err) {
      console.error('Ошибка в AuthContext:', err);
      setToken(null);
      setError(err instanceof Error ? err : new Error('Ошибка авторизации'));
      if (err instanceof Error) {
        console.debug('Подробности ошибки:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
    } finally {
      setLoading(false);
    }
  };
    
  const retryAuth = async () => {
    // Очищаем токен перед повторной попыткой
    resetToken();
    await authenticate();
  };
  
  const logout = () => {
    resetToken();
    setToken(null);
  };
  
  useEffect(() => {
    authenticate();
  }, []);
  
  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      token,
      loading,
      error,
      retryAuth,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 