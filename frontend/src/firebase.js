// Gemini COMMENT: Import only the necessary functions from the Firebase SDK.
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import api from "./apiConfig.js";

// Gemini COMMENT: INFRASTRUCTURE REFACTOR - This block now dynamically selects the correct Firebase configuration
// based on the environment. Vite provides `import.meta.env.DEV` which is `true` during development (`npm run dev`).
const isDevelopment = import.meta.env.DEV;

// Gemini COMMENT: Conditionally select the production or development config object.
const firebaseConfig = isDevelopment
  ? {
      apiKey: import.meta.env.VITE_DEV_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_DEV_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_DEV_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_DEV_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_DEV_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_DEV_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_DEV_FIREBASE_MEASUREMENT_ID,
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };

// Gemini COMMENT: Conditionally select the correct VAPID key.
const VAPID_KEY = isDevelopment
  ? import.meta.env.VITE_DEV_FIREBASE_VAPID_KEY
  : import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Gemini COMMENT: A log to confirm which environment is active. This is useful for debugging.
console.log(
  isDevelopment
    ? "Firebase running in DEV mode."
    : "Firebase running in PROD mode."
);

// Initialize Firebase with the dynamically selected configuration
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Gemini COMMENT: REFACTOR - The function now accepts the service worker registration object.
export const requestForToken = async (swRegistration) => {
  // Gemini COMMENT: CRITICAL FIX - Add a guard clause. Do not proceed if the registration object isn't ready.
  // This prevents errors if `getToken` is called before the service worker is active.
  if (!swRegistration) {
    console.error("Service worker registration not available yet.");
    return null;
  }

  try {
    // Gemini COMMENT: The hardcoded VAPID_KEY is replaced with the environment-aware variable.
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (currentToken) {
      await api.post("/devices/token", { token: currentToken });
      console.log("FCM Token successfully sent to server.");
      return currentToken; // <-- Explicitly return the token on success
    } else {
      console.log(
        "No registration token available. Request permission to generate one."
      );
      return null; // <-- Return null on failure
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
    // Gemini COMMENT: Re-throw the error so the calling component can catch it and handle specific cases (like permission denied).
    throw err;
  }
};
