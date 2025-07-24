import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import axios from 'axios';

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

// This function requests permission for notifications and gets the device token
export const requestForToken = () => {
  // The VAPID key is a security measure to ensure your server is the one sending notifications.
  // You get this from the Firebase Console: Project Settings > Cloud Messaging > Web Push certificates.
  return getToken(messaging, { vapidKey: 'BO0L9UFpX0v6bo3AoYtuBQEBKLVQi1SNZoMgR-Gp5_wgSSb6cJxARGlyEaygEPTy9Ybc57GHJK-ignlou8IWwhw' })
    .then((currentToken) => {
      if (currentToken) {
        console.log('FCM Token received:', currentToken);
        // Once we have the token, send it to our backend to be saved.
        axios.post('http://localhost:3001/api/devices/token', { token: currentToken })
            .then(() => console.log('Token sent to server successfully.'))
            .catch(err => console.error('Error sending token to server:', err));
      } else {
        // This happens if the user denies permission.
        console.log('No registration token available. Request permission to generate one.');
      }
    }).catch((err) => {
      console.log('An error occurred while retrieving token. ', err);
    });
};
