import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../apiConfig'; // We will create this file next

// 1. Create the context
const AuthContext = createContext();

// 2. Create the provider component
export const AuthProvider = ({ children }) => {
  // State to hold the auth token. We initialize it from localStorage.
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  // This effect runs whenever the token changes to update the apiConfig headers
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // Set the token on our API instance for all subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // --- Auth Functions ---

  const signup = async (email, password) => {
    try {
      await api.post('/auth/signup', { email, password });
      // After successful signup, automatically log the user in
      await login(email, password);
    } catch (error) {
      console.error('Signup failed:', error.response?.data?.error || error.message);
      // Re-throw the error so the form can display it
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.token) {
        setToken(response.data.token);
        // Redirect to the main app page on successful login
        navigate('/');
      }
    } catch (error) {
      console.error('Login failed:', error.response?.data?.error || error.message);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    // Redirect to the login page on logout
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;