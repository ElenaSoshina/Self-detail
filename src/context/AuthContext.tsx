import React, { createContext, useContext, useEffect, useState } from 'react';
import { login, getToken } from '../api/apiService';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  token: null,
  loading: true,
  error: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const authenticate = async () => {
      try {
        setLoading(true);
        const newToken = await login();
        setToken(newToken);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Ошибка авторизации'));
      } finally {
        setLoading(false);
      }
    };
    
    authenticate();
  }, []);
  
  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      token,
      loading,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 