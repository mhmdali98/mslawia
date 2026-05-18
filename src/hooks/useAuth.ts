import { useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { useStore } from '../store/useStore';

export function useAuth() {
  const { setUser, reset, addToast } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'مستخدم',
          photoURL: firebaseUser.photoURL || '',
        };
        setUser(user);
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { ...user, createdAt: new Date().toISOString() });
        } else {
          await setDoc(ref, user, { merge: true });
        }
      } else {
        reset();
      }
    });
    return unsubscribe;
  }, [setUser, reset]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      addToast('فشل تسجيل الدخول. حاول مرة أخرى.', 'error');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      reset();
    } catch {
      addToast('حدث خطأ أثناء تسجيل الخروج.', 'error');
    }
  };

  return { signInWithGoogle, logout };
}
