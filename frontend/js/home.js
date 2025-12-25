const API_BASE = "http://127.0.0.1:8000/api";

function getAccessToken() {
  return localStorage.getItem("access") || localStorage.getItem("access_token");
}

function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("access_token");
}

function toggleMenu() {
  const menu = document.getElementById("navMenu");
  const burger = document.getElementById("menuToggle");
  if (!menu || !burger) return;
  const isOpen = menu.classList.contains("active");
  menu.classList.toggle("active", !isOpen);
  burger.classList.toggle("active", !isOpen);
}

function closeMenu() {
  const menu = document.getElementById("navMenu");
  const burger = document.getElementById("menuToggle");
  if (!menu || !burger) return;
  menu.classList.remove("active");
  burger.classList.remove("active");
}

function buildMenu(items) {
  const navList = document.getElementById("navList");
  if (!navList) return;
  navList.innerHTML = items
    .map(
      (item) =>
        `<li><a href="${item.href}" data-action="${item.action || ""}"><i class="${item.icon}"></i>${item.label}</a></li>`
    )
    .join("");
}

function gotoDashboard(viewKey) {
  if (viewKey) {
    localStorage.setItem("alumno_view", viewKey);
  }
  window.location.href = "/alumno/dashboard.html";
}

function showGuest() {
  const heroTitle = document.getElementById("heroTitle");
  const heroText = document.getElementById("heroText");
  const cta = document.getElementById("ctaPrimary");
  const studentActions = document.getElementById("studentActions");

  if (heroTitle) heroTitle.innerHTML = 'Entrenamiento Inteligente <span>24/7</span>';
  if (heroText)
    heroText.textContent =
      "Smart Trainer te conecta con tu coach y tus planes personalizados de entrenamiento y nutricion.";
  if (cta) {
    cta.textContent = "Comenzar ahora";
    cta.setAttribute("href", "/auth/login.html");
    cta.onclick = null;
  }
  if (studentActions) studentActions.style.display = "none";

  buildMenu([
    { label: "Login", href: "/auth/login.html", icon: "fas fa-sign-in-alt" },
    { label: "Catalogo", href: "/catalogo.html", icon: "fas fa-store" },
    { label: "Comunidad", href: "/comunidad.html", icon: "fas fa-users" },
  ]);
}

function showStudent(profile) {
  const heroTitle = document.getElementById("heroTitle");
  const heroText = document.getElementById("heroText");
  const cta = document.getElementById("ctaPrimary");
  const studentActions = document.getElementById("studentActions");

  if (heroTitle) heroTitle.textContent = `Hola, ${profile?.user || "Alumno"}`;
  if (heroText) heroText.textContent = "Accede rapido a tu perfil, rutina y dieta.";
  if (cta) {
    cta.textContent = "Ir a mi panel";
    cta.setAttribute("href", "/alumno/dashboard.html");
    cta.onclick = (e) => {
      e.preventDefault();
      gotoDashboard("perfil");
    };
  }
  if (studentActions) studentActions.style.display = "flex";

  buildMenu([
    { label: "Perfil", href: "#", action: "perfil", icon: "fas fa-user" },
    { label: "Entrenamiento", href: "#", action: "rutina", icon: "fas fa-dumbbell" },
    { label: "Dieta", href: "#", action: "dieta", icon: "fas fa-utensils" },
    { label: "Catalogo", href: "/catalogo.html", icon: "fas fa-store" },
    { label: "Progreso", href: "#", icon: "fas fa-chart-line" },
    { label: "Comunidad", href: "/comunidad.html", icon: "fas fa-users" },
    { label: "Logout", href: "#", action: "logout", icon: "fas fa-right-from-bracket" },
  ]);
}

async function fetchProfile(token) {
  const res = await fetch(`${API_BASE}/accounts/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearTokens();
    window.location.href = "/auth/login.html";
    return null;
  }

  if (!res.ok) {
    throw new Error("No se pudo obtener el perfil");
  }

  return res.json();
}

function bindStudentButtons() {
  const btnPerfil = document.getElementById("btnPerfil");
  const btnRutina = document.getElementById("btnRutina");
  const btnDieta = document.getElementById("btnDieta");

  if (btnPerfil) btnPerfil.addEventListener("click", () => gotoDashboard("perfil"));
  if (btnRutina) btnRutina.addEventListener("click", () => gotoDashboard("rutina"));
  if (btnDieta) btnDieta.addEventListener("click", () => gotoDashboard("dieta"));
}

function bindMenuActions() {
  const navList = document.getElementById("navList");
  if (!navList) return;

  navList.addEventListener("click", (e) => {
    const target = e.target.closest("a");
    if (!target) return;
    closeMenu();
    const action = target.getAttribute("data-action");
    if (!action) return;
    e.preventDefault();

    if (action === "logout") {
      clearTokens();
      window.location.href = "/home.html";
      return;
    }
    if (action === "perfil") {
      gotoDashboard("perfil");
      return;
    }
    if (action === "rutina") {
      gotoDashboard("rutina");
      return;
    }
    if (action === "dieta") {
      gotoDashboard("dieta");
      return;
    }
  });
}

function bindMenuToggle() {
  const burger = document.getElementById("menuToggle");
  if (burger) {
    burger.addEventListener("click", toggleMenu);
  }
}

// Carousel basic controls
function initCarousel() {
  const carousel = document.getElementById("carousel");
  const slides = carousel ? Array.from(carousel.querySelectorAll(".carousel-slide")) : [];
  const indicators = Array.from(document.querySelectorAll(".indicator"));
  const prevBtn = document.getElementById("prevSlide");
  const nextBtn = document.getElementById("nextSlide");
  if (!carousel || !slides.length) return;

  let currentSlide = 0;

  const update = () => {
    carousel.style.transform = `translateX(-${currentSlide * 100}%)`;
    indicators.forEach((indicator, idx) => {
      indicator.classList.toggle("active", idx === currentSlide);
    });
  };

  const next = () => {
    currentSlide = (currentSlide + 1) % slides.length;
    update();
  };

  const prev = () => {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    update();
  };

  if (nextBtn) nextBtn.addEventListener("click", next);
  if (prevBtn) prevBtn.addEventListener("click", prev);
  indicators.forEach((indicator, idx) => {
    indicator.addEventListener("click", () => {
      currentSlide = idx;
      update();
    });
  });

  setInterval(next, 5000);
}

async function initHome() {
  bindMenuToggle();
  bindStudentButtons();
  bindMenuActions();
  initCarousel();

  const token = getAccessToken();
  if (!token) {
    showGuest();
    return;
  }

  try {
    const profile = await fetchProfile(token);
    if (!profile) return;
    const role = profile.role === "ALUMNO" ? "STUDENT" : profile.role;
    if (role === "ADMIN" || role === "ROOT") {
      window.location.href = "/coach/dashboard.html";
      return;
    }
    showStudent(profile);
  } catch (err) {
    console.error(err);
    showGuest();
  }
}

document.addEventListener("DOMContentLoaded", initHome);
