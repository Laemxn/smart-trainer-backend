// Uses config exposed as global for classic scripts.
(async () => {
  const API_BASE_URL = window.API_BASE_URL || "https://smart-trainer-backend-cs9r.onrender.com";
  const API_BASE = `${API_BASE_URL}/api`;

  async function authFetch(endpoint, options = {}) {
    const token = localStorage.getItem("access_token");

    return fetch(API_BASE + endpoint, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  // Expose helper if needed elsewhere
  window.authFetch = authFetch;
})();
