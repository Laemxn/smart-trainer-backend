// Form to create a new coach (ADMIN) - only ROOT should use.
(async () => {
  const API = window.API_BASE_URL || "https://smart-trainer-backend-cs9r.onrender.com";

  function getAccess() {
    return localStorage.getItem("access");
  }

  function redirectToLogin() {
    window.location.href = "/auth/login.html";
  }

  async function createCoach(data) {
    const token = getAccess();
    if (!token) {
      redirectToLogin();
      throw new Error("No autenticado");
    }

    const res = await fetch(`${API}/api/accounts/admin/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (res.status === 401) {
      redirectToLogin();
      throw new Error("No autorizado");
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Error al crear coach");
    }

    return res.json();
  }

  function bindForm() {
    const form = document.getElementById("createCoachForm");
    const result = document.getElementById("result");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (result) result.textContent = "Creando coach...";

      const payload = {
        username: form.username.value,
        password: form.password.value,
        email: form.email.value || undefined,
        role: "ADMIN", // rol de coach
      };

      try {
        await createCoach(payload);
        if (result) result.textContent = "Coach creado correctamente.";
        form.reset();
      } catch (err) {
        if (result) result.textContent = `Error: ${err.message}`;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", bindForm);
})();
