import axios from 'axios';

// --- Environment-Specific API URL ---
// Your original logic for switching between dev and prod URLs is preserved here.
const isDevelopment = process.env.NODE_ENV === 'development';
const productionURL = 'https://last-checked-in-api.onrender.com/api';
const developmentURL = 'http://localhost:3001/api';
const API_URL = isDevelopment ? developmentURL : productionURL;

// --- Create a Pre-Configured Axios Instance ---
// Instead of exporting just the URL string, we now export an Axios object
// that has the base URL and our authentication logic already built-in.
const api = axios.create({
  baseURL: API_URL,
});

// --- Axios Request Interceptor ---
// This is the most critical piece. An "interceptor" is a function that
// runs BEFORE every single request you make with this 'api' instance.
api.interceptors.request.use(
  (config) => {
    // 1. It checks localStorage for a token.
    const token = localStorage.getItem('token');
    
    // 2. If the token exists, it adds the 'Authorization' header to the request.
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 3. It returns the modified request config so the request can proceed.
    return config;
  },
  (error) => {
    // If there's an error during this process, the request is rejected.
    return Promise.reject(error);
  }
);

// We now export the 'api' instance as the default.
export default api;

// We can still export the URL if needed elsewhere, but using the 'api' instance is preferred.
export { API_URL };