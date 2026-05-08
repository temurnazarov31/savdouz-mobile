import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const request = async (method, endpoint, body = null) => {
  const token = await SecureStore.getItemAsync("token");

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  // ✅ Add this to see raw response
  const text = await response.text();

  if (response.status === 204) return null;

  const data = JSON.parse(text);

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const get = (endpoint) => request("GET", endpoint);
export const post = (endpoint, body) => request("POST", endpoint, body);
export const patch = (endpoint, body) => request("PATCH", endpoint, body);
export const del = (endpoint) => request("DELETE", endpoint);
