import axios from "axios";

// Gemini COMMENT: This is the definitive, industry-standard configuration for Vite.
// It uses Vite's built-in `MODE` to distinguish between environments, removing all ambiguity.
const isProduction = import.meta.env.MODE === "production";

// In production, the URL MUST come from the Vercel environment variable.
// In development, we hardcode it to point to our local backend.
const API_URL = isProduction
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3001/api";

if (!API_URL) {
  throw new Error(
    "API_URL is not defined. Ensure VITE_API_URL is set in your deployment environment."
  );
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("session_expired"));
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
