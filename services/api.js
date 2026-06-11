import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Cache 
const cache = {};

export const getCached = async (url) => {
  if (cache[url]) {
    return cache[url]; 
  }
  const data = await get(url);
  cache[url] = data;
  return data;
};

export const invalidateCache = (...urls) => {
  urls.forEach((url) => delete cache[url]);
};

export const clearCache = () => {
  Object.keys(cache).forEach((key) => delete cache[key]);
};

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

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text);
  }

  if (!response.ok) {
    throw new Error(data.code || data.message || "Something went wrong");
  }

  return data;
};

// Frontend (api.js)
// const verifyOTP = async (email, code) => {
//   return await post('/auth/verify-otp', { email, code });
// };

export const get = (endpoint) => request("GET", endpoint);
export const post = (endpoint, body) => request("POST", endpoint, body);
export const patch = (endpoint, body) => request("PATCH", endpoint, body);
export const del = (endpoint) => request("DELETE", endpoint);
