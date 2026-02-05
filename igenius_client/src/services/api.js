// src/services/api.js
import axios from "axios";

const API_BASE_URL = "https://igeniusdictation.demovoting.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for handling 401 errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("❌ Response error:", {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
    });
    return Promise.reject(error);
  },
);

export const levelApi = {
  // Get all levels
  getAll: () => api.get("/levels"),

  // Get specific level
  getLevel: (slug) => api.get(`/levels/${slug}`),

  // Get weeks for a level
  getWeeks: (levelSlug) => api.get(`/levels/${levelSlug}/weeks`),

  // Get question sets for a week
  getQuestionSets: (levelSlug, weekNumber) =>
    api.get(`/levels/${levelSlug}/weeks/${weekNumber}/question-sets`),

  // Get questions for a question set
  getQuestions: (levelSlug, weekNumber, questionSetId) =>
    api.get(
      `/levels/${levelSlug}/weeks/${weekNumber}/question-sets/${questionSetId}/questions`,
    ),
};

export default api;
