// Uses config exposed as global for classic scripts.
(async () => {
  const API_BASE_URL = window.API_BASE_URL || "https://smart-trainer-backend-cs9r.onrender.com";
  const API_BASE = `${API_BASE_URL}/api`;

  document.addEventListener("DOMContentLoaded", () => {
    const hamburgerMenu = document.querySelector(".hamburger-menu");
    const navMenu = document.querySelector(".nav-menu");

    if (hamburgerMenu && navMenu) {
      hamburgerMenu.addEventListener("click", () => {
        hamburgerMenu.classList.toggle("active");
        navMenu.classList.toggle("active");
      });

      document.querySelectorAll(".nav-menu a").forEach((link) => {
        link.addEventListener("click", () => {
          hamburgerMenu.classList.remove("active");
          navMenu.classList.remove("active");
        });
      });
    }

    const current = window.location.pathname.split("/").pop();
    if (current) {
      document.querySelectorAll(".nav-menu a").forEach((link) => {
        if (link.getAttribute("href") === `./${current}`) {
          link.classList.add("active");
        }
      });
    }

    document.querySelectorAll("[data-logout]").forEach((logoutLink) => {
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("access_token");
        window.location.replace("/home.html");
      });
    });

    setupRootExtras();
  });

  function getAccessToken() {
    return localStorage.getItem("access") || localStorage.getItem("access_token");
  }

  async function setupRootExtras() {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/accounts/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const profile = await res.json();
      const role = profile.role === "ALUMNO" ? "STUDENT" : profile.role;
      if (role !== "ROOT") return;

      const navList = document.querySelector(".nav-menu ul");
      if (navList && !navList.querySelector("[data-root-catalog]")) {
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = "/catalogo.html";
        link.setAttribute("data-root-catalog", "true");
        link.innerHTML = `<i class="fas fa-play-circle"></i> Crear ejercicios`;
        li.appendChild(link);

        const logoutItem = navList.querySelector("[data-logout]")?.closest("li");
        if (logoutItem) {
          navList.insertBefore(li, logoutItem);
        } else {
          navList.appendChild(li);
        }
      }

      const rootCard = document.getElementById("rootCatalogCard");
      if (rootCard) {
        rootCard.style.display = "block";
      }
    } catch (err) {
      console.error("No se pudo preparar el panel ROOT", err);
    }
  }
})();
