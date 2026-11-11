import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCQkS49yFSu4SUY0j42xiijO1gEYqJTIL0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'togetherpay-5c73f.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://togetherpay-5c73f-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'togetherpay-5c73f',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'togetherpay-5c73f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '514980135951',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:514980135951:web:9b25d37848b4cada0b4f7a',
};

export const app = initializeApp(firebaseConfig);

// Connect to the provisioned Enterprise Edition Firestore database 'togetherpay-db' in asia-southeast3
export const db = getFirestore(app, 'togetherpay-db');
