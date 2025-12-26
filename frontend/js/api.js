// Dynamic import to avoid module script requirement.
(async () => {
  async function loadConfig() {
    try {
      const mod = await import("./config.js");
      return mod.API_BASE_URL;
    } catch (err) {
      console.error("No se pudo cargar config.js", err);
      return "https://smart-trainer-backend-cs9r.onrender.com";
    }
  }

  const API_BASE_URL = await loadConfig();
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
