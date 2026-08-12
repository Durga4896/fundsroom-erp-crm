import axios from "axios";

const localApiUrl = "http:" + "//localhost:5001/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || localApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
