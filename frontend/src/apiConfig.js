import axios from "axios";

// --- Environment-Specific API URL ---
// Your original logic for switching between dev and prod URLs is preserved here.
const isDevelopment = process.env.NODE_ENV === "development";
const productionURL = "https://last-checked-in-api.onrender.com/api";
const developmentURL = "http://localhost:3001/api";
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
    const token = localStorage.getItem("token");

    // 2. If the token exists, it adds the 'Authorization' header to the request.
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // 3. It returns the modified request config so the request can proceed.
    return config;
  },
  (error) => {
    // If there's an error during this process, the request is rejected.
    return Promise.reject(error);
  }
);

// --- Gemini NEW: Axios Response Interceptor for Global Error Handling ---
// This interceptor runs AFTER a response is received from the server.
api.interceptors.response.use(
  // The first function handles successful responses (2xx status codes).
  // We don't need to do anything here, so we just pass the response through.
  (response) => response,
  // The second function handles error responses. This is where we catch the 401.
  (error) => {
    // Check if the error is a 401 Unauthorized response.
    // We also check that this isn't an error from the login page itself, to avoid logout loops.
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes("/auth/login")
    ) {
      // Gemini NEW: If it's a 401, we take immediate action to log the user out globally.
      // 1. We remove the expired token from storage.
      localStorage.removeItem("token");
      // 2. We dispatch a custom browser event. This is a clean way to signal
      //    the rest of the app (specifically the AuthContext) that the session
      //    has ended, without creating circular dependencies.
      window.dispatchEvent(new Event("session_expired"));
    }

    // IMPORTANT: We still reject the promise so that the original function that
    // made the API call knows that it failed. This allows for local error handling
    // (like stopping a loading spinner) to still function correctly.
    return Promise.reject(error);
  }
);

// We now export the 'api' instance as the default.
export default api;

// We can still export the URL if needed elsewhere, but using the 'api' instance is preferred.
export { API_URL };
