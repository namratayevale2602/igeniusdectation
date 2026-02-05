import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

// Create main API instance - Use localhost instead of 127.0.0.1
const api = axios.create({
  baseURL: "https://igeniusdictation.demovoting.com/api",
  withCredentials: true, // ← ADD THIS
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// // Enhanced request interceptor
// api.interceptors.request.use(
//   (config) => {
//     console.log("🔄 API Request:", {
//       method: config.method?.toUpperCase(),
//       url: config.url,
//       data: config.data,
//     });
//     return config;
//   },
//   (error) => {
//     console.error("❌ Request Interceptor Error:", error);
//     return Promise.reject(error);
//   },
// );

// // Enhanced response interceptor
// api.interceptors.response.use(
//   (response) => {
//     console.log("✅ API Response Success:", {
//       status: response.status,
//       data: response.data,
//     });
//     return response;
//   },
//   async (error) => {
//     console.error("❌ API Response Error:", {
//       status: error.response?.status,
//       data: error.response?.data,
//       message: error.message,
//     });

//     return Promise.reject(error);
//   },
// );

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Get CSRF Token (required for Laravel Sanctum)
      getCsrfToken: async () => {
        try {
          console.log("🛡️ Getting CSRF token...");
          // Note: This goes to /sanctum/csrf-cookie (not /api/sanctum/csrf-cookie)
          const response = await axios.get(
            "https://igeniusdictation.demovoting.com/sanctum/csrf-cookie",
            {
              withCredentials: true,
            },
          );
          console.log("✅ CSRF token received");
          return true;
        } catch (error) {
          console.error("❌ CSRF token error:", error);
          return false;
        }
      },

      // Login action - SIMPLIFIED VERSION
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          console.log("🔐 Starting login process...");

          // Step 1: Get CSRF token FIRST
          console.log("Step 1: Getting CSRF token...");
          await get().getCsrfToken();

          // Step 2: Perform login
          console.log("Step 2: Sending login request...");
          console.log("Request data:", { email, password });

          const response = await api.post("/login", {
            email: email,
            password: password,
          });

          console.log("✅ Login successful:", response.data);

          // Step 3: Store user data
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Step 4: Check cookies
          console.log("🍪 Cookies after login:", document.cookie);

          return { success: true, data: response.data };
        } catch (error) {
          console.error("❌ Login failed:", error);

          let errorMessage = "Login failed";

          if (error.response?.data?.errors) {
            // Show validation errors
            const errors = error.response.data.errors;
            errorMessage = Object.values(errors).flat().join(", ");
          } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.message) {
            errorMessage = error.message;
          }

          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });

          return { success: false, error: errorMessage };
        }
      },

      // Check authentication status
      checkAuth: async () => {
        try {
          console.log("🔍 Checking auth status...");
          const response = await api.get("/check-auth");

          if (response.data.authenticated) {
            set({
              user: response.data.user,
              isAuthenticated: true,
            });
            return { authenticated: true, user: response.data.user };
          } else {
            set({
              user: null,
              isAuthenticated: false,
            });
            return { authenticated: false };
          }
        } catch (error) {
          console.error("Auth check error:", error);
          set({
            user: null,
            isAuthenticated: false,
          });
          return { authenticated: false };
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true });
        try {
          await api.post("/logout");
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
