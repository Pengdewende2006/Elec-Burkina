import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyC5IouPvaXLOosuJkRae8QdR-BS1UcfMZI",
  authDomain: "elec-burkina.firebaseapp.com",
  projectId: "elec-burkina",
  storageBucket: "elec-burkina.firebasestorage.app",
  messagingSenderId: "587732091655",
  appId: "1:587732091655:web:1004949709e04505d13ba2",
  measurementId: "G-8PVLNYX91B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: "BHmmcaNGyuYMzpIh8p-fYhRd5Arn9c3ECzDdgyvFyiLh5GyygE1JBbfeSCVUIVhCkjN2BF-nedA2PfTU5m3ypqM"
    });
    if (token) {
      console.log("Token notification:", token);
      return token;
    }
  } catch (e) {
    console.log("Erreur notification:", e);
  }
};

export { onMessage };
