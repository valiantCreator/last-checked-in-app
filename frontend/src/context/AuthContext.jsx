import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../apiConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  // This effect is now just for cleaning up on logout or token expiry
  useEffect(() => {
    if (!token) {
      localStorage.removeItem('token');
    }
  }, [token]);

  const signup = async (email, password) => {
    try {
      await api.post('/auth/signup', { email, password });
      await login(email, password);
    } catch (error) {
      console.error('Signup failed:', error.response?.data?.error || error.message);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const newToken = response.data.token;
      if (newToken) {
        // FIX: Write to localStorage immediately.
        localStorage.setItem('token', newToken);
        // Then update the state.
        setToken(newToken);
        // Then navigate.
        navigate('/');
      }
    } catch (error) {
      console.error('Login failed:', error.response?.data?.error || error.message);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;