import { create } from 'zustand';
import { User } from 'firebase/auth';
import { onAuthChange } from '../firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  init: () => {
    const unsubscribe = onAuthChange((user) => {
      set({ user, loading: false, initialized: true });
    });
    return unsubscribe;
  },
}));
