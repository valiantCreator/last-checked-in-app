// This file must be in the public folder

importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

// --- IMPORTANT ---
// Paste your own firebaseConfig object here

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

// Initialize Firebase within the service worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This function handles messages that are received while the app is in the background (i.e., tab is not active, or browser is minimized).
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Extract the title and body from the incoming notification payload.
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Optional: You can place an icon in your 'public' folder to be displayed with the notification.
  };

  // Use the browser's Service Worker API to show the notification to the user.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
