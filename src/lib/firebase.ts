import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD5UrPDGYxz5qFuQMPOrrLRGgVFTJcUBgI",
  authDomain: "mslawia.firebaseapp.com",
  projectId: "mslawia",
  storageBucket: "mslawia.firebasestorage.app",
  messagingSenderId: "474856869413",
  appId: "1:474856869413:web:48242d2937eabee12339cc",
  measurementId: "G-MTZW7G3JMG",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});
