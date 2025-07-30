// This file centralizes the API URL and makes it dynamic.

// Vite sets this environment variable automatically.
// It will be 'development' when you run `npm run dev`.
// It will be 'production' when you build the app for deployment.
const isDevelopment = process.env.NODE_ENV === 'development';

const productionURL = 'https://last-checked-in-api.onrender.com/api';
const developmentURL = 'http://localhost:3001/api';

// Export the correct URL based on the current environment.
export const API_URL = isDevelopment ? developmentURL : productionURL;