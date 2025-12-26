// Base URL del backend desplegado.
const API_BASE_URL = "https://smart-trainer-backend-cs9r.onrender.com";

// Exponer en window para los scripts clasicos.
if (typeof window !== "undefined") {
  window.API_BASE_URL = API_BASE_URL;
}

// Compatibilidad para entornos CommonJS (tests o build tools).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { API_BASE_URL };
}
