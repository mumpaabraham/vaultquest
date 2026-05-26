import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

type AuthState = 'loading' | 'unauthenticated' | 'unauthorized' | 'authorized';

export function useAuth() {
  const [state, setState] = useState<AuthState>('loading');
  const [user, setUser]   = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState('unauthenticated');
        setUser(null);
        return;
      }
      const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
      if (!adminDoc.exists()) {
        setState('unauthorized');
        setUser(null);
        return;
      }
      setUser(firebaseUser);
      setState('authorized');
    });
    return unsub;
  }, []);

  return { state, user };
}
