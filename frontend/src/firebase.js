// Gemini COMMENT: Import only the necessary functions from the Firebase SDK.
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import api from "./apiConfig.js";

// Gemini COMMENT: SECURITY FIX - The Firebase config is now loaded from environment variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase with your configuration
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Gemini COMMENT: It's better practice to also store this VAPID key as an environment variable.
const VAPID_KEY =
  "BO0L9UFpX0v6bo3AoYtuBQEBKLVQi1SNZoMgR-Gp5_wgSSb6cJxARGlyEaygEPTy9Ybc57GHJK-ignlou8IWwhw";

// Gemini COMMENT: REFACTOR - The function now accepts the service worker registration object.
export const requestForToken = async (swRegistration) => {
  // Gemini COMMENT: CRITICAL FIX - Add a guard clause. Do not proceed if the registration object isn't ready.
  // This prevents errors if `getToken` is called before the service worker is active.
  if (!swRegistration) {
    console.error("Service worker registration not available yet.");
    return null;
  }

  try {
    // Gemini COMMENT: CRITICAL FIX - Pass the registration object to `getToken`.
    // This forces Firebase to use our existing, correctly-served service worker
    // instead of trying to register its own, which solves the MIME type error.
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
    return null; // <-- Return null on error
  }
};
