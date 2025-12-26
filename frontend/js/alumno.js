// Uses config exposed as global for classic scripts.
(async () => {
  const API = window.API_BASE_URL || "https://smart-trainer-backend-cs9r.onrender.com";

  function getAccess() {
    return localStorage.getItem("access");
  }

  function redirectToLogin() {
    window.location.href = "/auth/login.html";
  }

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/home.html";
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
      logout();
      throw new Error("Token invalido o expirado (401)");
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error ${res.status}: ${text}`);
    }

    return res.json();
  }

  function setupMenu() {
    const menuBtn = document.getElementById("menuBtn");
    const sideMenu = document.getElementById("sideMenu");

    if (menuBtn && sideMenu) {
      menuBtn.addEventListener("click", () => {
        sideMenu.classList.toggle("open");
      });

      document.addEventListener("click", (e) => {
        const clickedInside = sideMenu.contains(e.target) || menuBtn.contains(e.target);
        if (!clickedInside) sideMenu.classList.remove("open");
      });
    }

    const hamburgerMenu = document.querySelector(".hamburger-menu");
    const navMenu = document.querySelector(".nav-menu");

    if (hamburgerMenu && navMenu) {
      hamburgerMenu.addEventListener("click", () => {
        hamburgerMenu.classList.toggle("active");
        navMenu.classList.toggle("active");
      });

      document.addEventListener("click", (e) => {
        const clickedInside = navMenu.contains(e.target) || hamburgerMenu.contains(e.target);
        if (!clickedInside) {
          hamburgerMenu.classList.remove("active");
          navMenu.classList.remove("active");
        }
      });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    const logoutLink = document.querySelector("[data-logout]");
    if (logoutLink) {
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    }
  }

  function renderProfile(profile) {
    const el = document.getElementById("status");
    if (!el) return;

    el.textContent = `
Usuario: ${profile.user ?? profile.username ?? "N/A"}
Edad: ${profile.age ?? "N/A"}
Estatura: ${profile.height_cm ?? "N/A"} cm
Peso: ${profile.weight_kg ?? "N/A"} kg
Objetivo: ${profile.objective ?? "N/A"}
Nivel: ${profile.level ?? "N/A"}
`.trim();
  }

  function renderWorkout(workout) {
    const el = document.getElementById("routine");
    if (!el) return;
    renderPlan(el, workout && workout.content, {
      emptyTitle: "Rutina no asignada",
      emptyText: "Tu coach esta preparando tu entrenamiento.",
    });
  }

  function renderDiet(diet) {
    const el = document.getElementById("diet");
    if (!el) return;
    renderPlan(el, diet && diet.content, {
      emptyTitle: "Dieta no asignada",
      emptyText: "Tu plan nutricional estara disponible pronto.",
    });
  }

  async function init() {
    setupMenu();
    setupNavigation();

    const profileEl = document.getElementById("status");
    const routineEl = document.getElementById("routine");
    const dietEl = document.getElementById("diet");
    const downloadRoutineBtn = document.getElementById("downloadRoutine");
    const downloadDietBtn = document.getElementById("downloadDiet");

    if (profileEl) profileEl.textContent = "Cargando perfil...";
    if (routineEl) routineEl.textContent = "Cargando rutina...";
    if (dietEl) dietEl.textContent = "Cargando dieta...";

    try {
      const profile = await apiGet("/api/students/me/");
      renderProfile(profile);
    } catch (e) {
      if (profileEl) profileEl.textContent = "No se pudo cargar el perfil.";
      console.error(e);
    }

    try {
      const workout = await apiGet("/api/plans/workouts/me/");
      renderWorkout(workout);
    } catch (e) {
      if (routineEl) routineEl.textContent = "No se pudo cargar la rutina.";
      console.error(e);
    }

    try {
      const diet = await apiGet("/api/plans/diets/me/");
      renderDiet(diet);
    } catch (e) {
      if (dietEl) dietEl.textContent = "No se pudo cargar la dieta.";
      console.error(e);
    }

    if (downloadRoutineBtn) {
      downloadRoutineBtn.addEventListener("click", () => downloadPlan("routine", "Rutina semanal"));
    }
    if (downloadDietBtn) {
      downloadDietBtn.addEventListener("click", () => downloadPlan("diet", "Dieta semanal"));
    }
  }

  function setupNavigation() {
    const items = document.querySelectorAll("[data-go]");
    const navLinks = document.querySelectorAll(".nav-menu [data-go]");
    const views = document.querySelectorAll("[data-view]");
    const navMenu = document.querySelector(".nav-menu");
    const hamburgerMenu = document.querySelector(".hamburger-menu");

    if (!items.length || !views.length) return;

    function show(view) {
      localStorage.setItem("alumno_view", view);

      views.forEach((section) => {
        if (section.getAttribute("data-view") === view) {
          section.classList.add("active");
          section.style.display = "block";
        } else {
          section.classList.remove("active");
          section.style.display = "none";
        }
      });

      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("data-go") === view);
      });
    }

    items.forEach((item) => {
      item.addEventListener("click", (e) => {
        if (item.tagName === "A") {
          e.preventDefault();
        }

        const view = item.getAttribute("data-go");
        if (view) show(view);

        if (navMenu && hamburgerMenu) {
          navMenu.classList.remove("active");
          hamburgerMenu.classList.remove("active");
        }
      });
    });

    const savedView = localStorage.getItem("alumno_view") || "perfil";
    show(savedView);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderPlan(el, content, emptyCopy) {
    if (!content || !String(content).trim()) {
      el.innerHTML = `
        <div class="empty-state">
          <strong>${emptyCopy?.emptyTitle ?? "No disponible"}</strong>
          <p>${emptyCopy?.emptyText ?? ""}</p>
        </div>
      `;
      return;
    }

    const blocks = String(content)
      .trim()
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    const html = blocks
      .map((block) => {
        const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return "";
        const [title, ...items] = lines;
        const itemsHtml = items.length ? `<ul>${items.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : "";
        return `
          <div class="plan-block">
            <div class="plan-title">${escapeHtml(title)}</div>
            ${itemsHtml}
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    el.innerHTML =
      html ||
      `<div class="plan-block"><div class="plan-title">${escapeHtml(String(content).trim())}</div></div>`;
  }

  function downloadPlan(elementId, title) {
    const el = document.getElementById(elementId);
    if (!el || !el.innerHTML.trim()) return;

    const printable = window.open("", "_blank");
    if (!printable) return;

    const styles = `
      body { font-family: "Outfit", "Segoe UI", sans-serif; color: #0f172a; padding: 28px; }
      h1 { margin: 0 0 16px; letter-spacing: -0.01em; }
      .plan-block { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; background: #f9fafb; }
      .plan-title { font-weight: 700; margin-bottom: 8px; }
      ul { margin: 0; padding-left: 18px; }
      li { margin-bottom: 4px; }
    `;

    printable.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>${styles}</style>
        </head>
        <body>
          <h1>${title}</h1>
          ${el.innerHTML}
        </body>
      </html>
    `);
    printable.document.close();
    printable.focus();
    printable.print();
    printable.close();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
