import axios from "axios";

// Gemini COMMENT: This is the definitive, simplified configuration.
// It relies on a single environment variable, VITE_API_URL, which MUST be set
// in the deployment environment (Vercel) and can be overridden locally.
const API_URL =
  import.meta.env.VITE_API_URL_OVERRIDE || import.meta.env.VITE_API_URL;

// Gemini COMMENT: If the API_URL is not set, we throw an error immediately to prevent silent failures.
if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not defined. Please set it in your .env file or deployment environment."
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
