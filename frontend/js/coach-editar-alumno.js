// Dynamic import to avoid module script requirement.
(async () => {
  async function loadConfig() {
    try {
      const mod = await import("./config.js");
      return mod.API_BASE_URL;
    } catch (err) {
      try {
        const mod = await import("/js/config.js");
        return mod.API_BASE_URL;
      } catch (err2) {
        console.error("No se pudo cargar config.js", err, err2);
        return "https://smart-trainer-backend-cs9r.onrender.com";
      }
    }
  }

  const API = await loadConfig();

  function getAccess() {
    return localStorage.getItem("access");
  }

  function redirectToLogin() {
    window.location.href = "/auth/login.html";
  }

  function getStudentId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  async function apiRequest(path, options = {}) {
    const token = getAccess();
    if (!token) {
      redirectToLogin();
      throw new Error("Sin token");
    }

    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      redirectToLogin();
      throw new Error("Token invalido o expirado");
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  }

  async function loadStudent(id) {
    const statusEl = document.getElementById("status");
    const nameEl = document.getElementById("studentName");
    const form = document.getElementById("editStudentForm");

    if (!statusEl || !form) return;

    statusEl.textContent = "Cargando alumno...";

    try {
      const student = await apiRequest(`/api/students/${id}/`, { method: "GET" });

      if (nameEl) {
        nameEl.textContent = `Alumno: ${student.username} (ID ${student.id})`;
      }

      form.age.value = student.age ?? "";
      form.height_cm.value = student.height_cm ?? "";
      form.weight_kg.value = student.weight_kg ?? "";
      form.objective.value = student.objective ?? "Volumen";
      form.level.value = student.level ?? "Principiante";

      statusEl.textContent = "";
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      form.style.display = "none";
    }
  }

  async function init() {
    const id = getStudentId();
    const statusEl = document.getElementById("status");
    const form = document.getElementById("editStudentForm");
    const resultEl = document.getElementById("result");

    if (!form || !statusEl) return;

    if (!id) {
      form.style.display = "none";
      return;
    }

    await loadStudent(id);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (resultEl) resultEl.textContent = "Guardando cambios...";

      const data = {
        age: Number(form.age.value),
        height_cm: Number(form.height_cm.value),
        weight_kg: Number(form.weight_kg.value),
        objective: form.objective.value,
        level: form.level.value,
      };

      try {
        await apiRequest(`/api/students/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        if (resultEl) resultEl.textContent = "Cambios guardados.";
      } catch (err) {
        if (resultEl) resultEl.textContent = `Error: ${err.message}`;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
