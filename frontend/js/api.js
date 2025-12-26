// Dynamic import to avoid module script requirement.
(async () => {
  const { API_BASE_URL } = await import("/js/config.js");
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
