// This file must be in the public folder
// Import the Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

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

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  // Customize the notification here
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/LogoV1.png' // Or another icon in your public folder
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});