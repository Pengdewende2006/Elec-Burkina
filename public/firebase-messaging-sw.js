importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC5IouPvaXLOosuJkRae8QdR-BS1UcfMZI",
  authDomain: "elec-burkina.firebaseapp.com",
  projectId: "elec-burkina",
  storageBucket: "elec-burkina.firebasestorage.app",
  messagingSenderId: "587732091655",
  appId: "1:587732091655:web:1004949709e04505d13ba2"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
  });
});
