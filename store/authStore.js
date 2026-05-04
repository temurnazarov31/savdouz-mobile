import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { get as apiGet, post } from "../services/api";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (emailOrPhone, password) => {
    set({ isLoading: true, error: null });
    try {
      // Detect if input is phone or email
      const isPhone =
        emailOrPhone.startsWith("+") || /^\d+$/.test(emailOrPhone);

      const data = await post("/users/login", {
        [isPhone ? "phone" : "email"]: emailOrPhone,
        password,
      });

      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.data?.user));
      await SecureStore.setItemAsync("role", data.data?.user?.role || "user");
      set({ user: data.data?.user, token: data.token, isLoading: false });
      return true;
    } catch (err) {
      set({ error: err.message || "Login failed", isLoading: false });
      return false;
    }
  },

  signup: async (name, email, phone, password, passwordConfirm) => {
    set({ isLoading: true, error: null });
    try {
      const data = await post("/users/signup", {
        name,
        email,
        phone,
        password,
        passwordConfirm,
      });
      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.data?.user));

      set({ user: data.data?.user, token: data.token, isLoading: false });
      return true;
    } catch (err) {
      set({ error: err.message || "Signup failed", isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
    await SecureStore.deleteItemAsync("role");
    set({ user: null, token: null });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        set({ token });
        const data = await apiGet("/users/getMe");
        const freshUser = data.data?.user;
        await SecureStore.setItemAsync("user", JSON.stringify(freshUser));
        await SecureStore.setItemAsync("role", freshUser?.role || "user");
        set({ user: { ...freshUser }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.log("loadUser error:", err);
      // restore from cache if network fails
      const userStr = await SecureStore.getItemAsync("user");
      const cachedUser = userStr ? JSON.parse(userStr) : null;
      set({ user: cachedUser, token: null, isLoading: false });
    }
  },
}));

export default useAuthStore;
