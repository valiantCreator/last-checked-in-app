import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../apiConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      localStorage.removeItem("token");
    }
  }, [token]);

  const signup = async (email, password) => {
    try {
      // NOTE: The signup endpoint in this app doesn't automatically log the user in.
      // It just creates the account. We still need to call login() after.
      await api.post("/auth/signup", { email, password });
      await login(email, password);
    } catch (error) {
      // REVISED: Improved error handling to be more specific.
      // It now checks for the 'details' array that our Zod middleware provides.
      if (error.response?.data?.details) {
        const firstError = error.response.data.details[0].message;
        console.error("Signup validation failed:", firstError);
        // Throw a new, cleaner error that the UI can display directly.
        throw new Error(firstError);
      } else {
        // Fallback for other errors (e.g., user already exists, server down).
        const errorMessage =
          error.response?.data?.error ||
          "An unknown error occurred during signup.";
        console.error("Signup failed:", errorMessage);
        throw new Error(errorMessage);
      }
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const newToken = response.data.token;
      if (newToken) {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        navigate("/");
      }
    } catch (error) {
      // REVISED: Similar improved error handling for the login function.
      if (error.response?.data?.details) {
        const firstError = error.response.data.details[0].message;
        console.error("Login validation failed:", firstError);
        throw new Error(firstError);
      } else {
        const errorMessage =
          error.response?.data?.error ||
          "An unknown error occurred during login.";
        console.error("Login failed:", errorMessage);
        throw new Error(errorMessage);
      }
    }
  };

  const logout = () => {
    setToken(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ token, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
