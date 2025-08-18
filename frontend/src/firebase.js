// frontend/src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
// UPDATED: Replaced 'axios' and 'API_URL' with our pre-configured 'api' instance
import api from './apiConfig.js'; 

// --- IMPORTANT ---
// Paste your own firebaseConfig object here from the Firebase console.
// This object contains your project's unique keys.

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDeLrFceFzBr0lbACkPBm7Xva_PtMsFHeg",
  authDomain: "last-checked-in.firebaseapp.com",
  projectId: "last-checked-in",
  storageBucket: "last-checked-in.firebasestorage.app",
  messagingSenderId: "813141602060",
  appId: "1:813141602060:web:792d25a43a9ccf3f152329",
  measurementId: "G-6PW5VDQPJQ"
};

// Initialize Firebase with your configuration
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY = 'BO0L9UFpX0v6bo3AoYtuBQEBKLVQi1SNZoMgR-Gp5_wgSSb6cJxARGlyEaygEPTy9Ybc57GHJK-ignlou8IWwhw';

// This function now uses async/await and correctly returns the token
export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (currentToken) {
      // UPDATED: This now uses our 'api' instance, which will automatically
      // include the Authorization header if the user is logged in.
      await api.post('/devices/token', { token: currentToken });
      console.log('FCM Token successfully sent to server.');
      return currentToken; // <-- Explicitly return the token on success
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null; // <-- Return null on failure
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null; // <-- Return null on error
  }
};