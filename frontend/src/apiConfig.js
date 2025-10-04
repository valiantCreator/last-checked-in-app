import axios from "axios";

// Gemini COMMENT: FIX - Vite uses `import.meta.env` for environment variables, not `process.env`.
// The logic is updated to correctly distinguish between dev, production, and a local preview.
const isProduction = import.meta.env.PROD;
const productionURL = "https://last-checked-in-api.onrender.com/api";
const developmentURL = "http://localhost:3001/api";

// Gemini COMMENT: The new override allows `npm run preview` to talk to the local backend.
const API_URL =
  import.meta.env.VITE_API_URL_OVERRIDE ||
  (isProduction ? productionURL : developmentURL);

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
