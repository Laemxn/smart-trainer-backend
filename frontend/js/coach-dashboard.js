// Dynamic import to keep classic script compatibility.
(async () => {
  const { API_BASE_URL } = await import("/js/config.js");
  const API = API_BASE_URL;

  function getAccess() {
    return localStorage.getItem("access");
  }

  function redirectToLogin() {
    window.location.href = "/auth/login.html";
  }

  async function apiGet(path) {
    const token = getAccess();
    if (!token) {
      redirectToLogin();
      throw new Error("Sin token");
    }

    const res = await fetch(`${API}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
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

  async function ensureCoachAccess(statusEl) {
    try {
      const me = await apiGet("/api/accounts/me/");
      if (!me || !["ADMIN", "ROOT"].includes(me.role)) {
        if (statusEl) {
          statusEl.textContent = "No autorizado. Inicia sesion como coach.";
        }
        if (me && me.redirect) {
          window.location.href = me.redirect;
        } else {
          redirectToLogin();
        }
        return false;
      }
      return true;
    } catch (err) {
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
      return false;
    }
  }

  async function loadSummary() {
    const statusEl = document.getElementById("summaryStatus");
    const studentsEl = document.getElementById("statStudents");
    const weeksEl = document.getElementById("statWeeks");
    const workoutsEl = document.getElementById("statWorkouts");
    const dietsEl = document.getElementById("statDiets");

    if (!studentsEl || !weeksEl || !workoutsEl || !dietsEl) return;

    if (statusEl) statusEl.textContent = "Cargando resumen...";

    const hasAccess = await ensureCoachAccess(statusEl);
    if (!hasAccess) return;

    try {
      const summary = await apiGet("/api/students/summary/");
      studentsEl.textContent = summary.students_total ?? 0;
      weeksEl.textContent = summary.active_weeks ?? 0;
      workoutsEl.textContent = summary.pending_workouts ?? 0;
      dietsEl.textContent = summary.pending_diets ?? 0;
      if (statusEl) statusEl.textContent = "";
    } catch (err) {
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadSummary);
})();
