import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await apiClient.get('/auth/me/');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            setToken(null);
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Listen for forced logout events from the API interceptor (refresh token expired)
  useEffect(() => {
    const handleForceLogout = () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const _fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login/', credentials);
      const { access, refresh, user } = response.data;

      localStorage.setItem('authToken', access);
      localStorage.setItem('refreshToken', refresh);
      setToken(access);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post('/auth/register/', userData);
      const { access, refresh, user } = response.data;

      localStorage.setItem('authToken', access);
      localStorage.setItem('refreshToken', refresh);
      setToken(access);
      setUser(user);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      // Proceed with local logout even if server logout fails
      console.error('Server logout failed:', error);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    isAuthenticated: !!user,
    apiClient // Export the axios instance for use in other components
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export the axios instance for use outside of the context
export { apiClient };

export default AuthContext;