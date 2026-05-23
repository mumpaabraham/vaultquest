import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Replace with your Firebase project config from https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyCVLKAz5V5aOZu6aCKR1BmLUZm76ytLK-o",
  authDomain: "vaultquest-app.firebaseapp.com",
  projectId: "vaultquest-app",
  storageBucket: "vaultquest-app.firebasestorage.app",
  messagingSenderId: "1064447795441",
  appId: "1:1064447795441:web:b0bd68b8c0b5ba015ec950",
  measurementId: "G-02V6XFE1EQ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
