import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { get as apiGet, post } from "../services/api";

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (loginInput, password) => {
  set({ isLoading: true, error: null });
  try {
    const isPhone = loginInput.startsWith("+") || /^\d+$/.test(loginInput);
    const isEmail = loginInput.includes("@");

    const data = await post("/users/login", {
      [isPhone ? "phone" : isEmail ? "email" : "username"]: loginInput,
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

  signup: async (
    username,
    name,
    surname,
    email,
    phone,
    password,
    passwordConfirm,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = await post("/users/signup", {
        username,
        name,
        surname,
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
    set({ user: null, token: null, isLoading: false, error: null }); // clear everything
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      set({ token });
      const data = await apiGet("/users/getMe");
      const freshUser = data.data?.user;
      await SecureStore.setItemAsync("user", JSON.stringify(freshUser));
      await SecureStore.setItemAsync("role", freshUser?.role || "user");
      set({ user: freshUser, isLoading: false });
    } catch (err) {
      // token is invalid/expired — clear everything and force login
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("role");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));

export default useAuthStore;
