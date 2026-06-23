import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@easysociety/shared';

const TOKEN_KEY = 'easysociety:token';
const USER_KEY = 'easysociety:user';

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

// Single source of truth for the auth session, persisted to AsyncStorage so
// users stay logged in across app restarts — important for low-connectivity
// areas where re-running OTP every launch would be a real friction point.
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrating: true,

  hydrate: async () => {
    const [token, userRaw] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    set({
      token,
      user: userRaw ? (JSON.parse(userRaw) as User) : null,
      isHydrating: false,
    });
  },

  setSession: async (token, user) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user });
  },

  updateUser: async (user) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
    set({ token: null, user: null });
  },
}));
