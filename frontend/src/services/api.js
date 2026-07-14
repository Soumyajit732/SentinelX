import axios from "axios";

// In dev, Vite proxies "/api" to the local backend (see vite.config.js).
// In production there's no dev server to proxy through, so the deployed
// backend URL must be supplied via VITE_API_URL at build time.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sentinelx_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
