const API_BASE = "http://127.0.0.1:8000/api";

async function authFetch(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  return fetch(API_BASE + endpoint, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
