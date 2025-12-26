// frontend/js/config.js
export const API_BASE_URL = "https://smart-trainer-backend-cs9r.onrender.com";

// Expose also as global for classic script usage.
if (typeof window !== "undefined") {
  window.API_BASE_URL = API_BASE_URL;
}
