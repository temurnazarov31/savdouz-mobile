import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import useAuthStore from "../store/authStore";

export default function useRole() {
  const { loadUser, user } = useAuthStore();
  const [role, setRole] = useState(user?.role || null);
  const isOwner = role === "owner";
  console.log("full reponse",user, role)

  useFocusEffect(
    useCallback(() => {
      loadUser().then(() => {
        const freshUser = useAuthStore.getState().user;
        if (freshUser?.role) {
          setRole(freshUser.role);
        } else {
          SecureStore.getItemAsync("role").then(setRole);
        }
      });
    }, []),
  );

  return { role, isOwner };
}