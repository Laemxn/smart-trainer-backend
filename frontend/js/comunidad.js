const API_BASE = "http://127.0.0.1:8000/api";

// Datos de las sucursales 24/7 Fitness Ensenada
const gymsData = [
  {
    id: 1,
    name: "24/7 Fitness Encinos",
    address: "Blvd. Lázaro Cárdenas 2090, Lomas de Encinos, 22890 Ensenada, B.C.",
    lat: 31.9102006,
    lng: -116.5976744,
    phone: "+52 646 123 4567",
    hours: "Abierto 24/7",
    rating: 4.8,
    services: ["Pesas Libres", "Cardio", "Clases Grupales", "Estacionamiento", "Lockers"],
    isOpen: true,
    description: "Sucursal moderna con equipamiento de última generación y amplia zona de pesas libres.",
  },
  {
    id: 2,
    name: "24/7 Fitness Centro",
    address: "Av. Reforma 123, Centro, 22800 Ensenada, B.C.",
    lat: 31.8677369,
    lng: -116.6217673,
    phone: "+52 646 234 5678",
    hours: "Abierto 24/7",
    rating: 4.6,
    services: ["Pesas Libres", "Cardio", "Área Funcional", "Vestidores", "Wi-Fi"],
    isOpen: true,
    description: "Ubicación céntrica ideal para entrenar antes o después del trabajo.",
  },
  {
    id: 3,
    name: "24/7 Fitness Santa Lucía",
    address: "Blvd. Costero 456, Santa Lucía, 22890 Ensenada, B.C.",
    lat: 31.8158325,
    lng: -116.5954465,
    phone: "+52 646 345 6789",
    hours: "Abierto 24/7",
    rating: 4.9,
    services: ["Pesas Libres", "Cardio", "Piscina", "Sauna", "Estacionamiento"],
    isOpen: true,
    description: "Sucursal premium con piscina y áreas de recuperación.",
  },
];

let map;
let userLocation = null;
let markers = [];
let currentNearestGym = null;

document.addEventListener("DOMContentLoaded", () => {
  initializeHamburgerMenu();
  bindMenuActions();
  setupNavState();
  setupEventListeners();
  initializeMap();
  loadGymsData();
});

function initializeHamburgerMenu() {
  const hamburgerMenu = document.getElementById("menuToggle");
  const navMenu = document.getElementById("navMenu");

  if (hamburgerMenu && navMenu) {
    hamburgerMenu.addEventListener("click", () => {
      hamburgerMenu.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        hamburgerMenu.classList.remove("active");
        navMenu.classList.remove("active");
      });
    });
  }
}

function closeMenu() {
  const navMenu = document.getElementById("navMenu");
  const hamburgerMenu = document.getElementById("menuToggle");
  if (navMenu) navMenu.classList.remove("active");
  if (hamburgerMenu) hamburgerMenu.classList.remove("active");
}

function getAccessToken() {
  return localStorage.getItem("access") || localStorage.getItem("access_token");
}

function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("access_token");
}

function buildMenu(items) {
  const navList = document.getElementById("navList");
  if (!navList) return;
  navList.innerHTML = items
    .map(
      (item) =>
        `<li><a href="${item.href}" ${item.active ? 'class="active"' : ""} data-action="${item.action || ""}"><i class="${item.icon}"></i> ${item.label}</a></li>`
    )
    .join("");
}

function gotoDashboard(viewKey) {
  if (viewKey) {
    localStorage.setItem("alumno_view", viewKey);
  }
  window.location.href = "/frontend/alumno/dashboard.html";
}

function showGuestNav() {
  buildMenu([
    { label: "Inicio", href: "/frontend/home.html", icon: "fas fa-home" },
    { label: "Catalogo", href: "/frontend/catalogo.html", icon: "fas fa-play-circle" },
    { label: "Comunidad", href: "/frontend/comunidad.html", icon: "fas fa-users", active: true },
    { label: "Login", href: "/frontend/auth/login.html", icon: "fas fa-sign-in-alt" },
  ]);
}

function showStudentNav(profile) {
  buildMenu([
    { label: `Hola, ${profile?.user || "Alumno"}`, href: "#", action: "perfil", icon: "fas fa-user" },
    { label: "Entrenamiento", href: "#", action: "rutina", icon: "fas fa-dumbbell" },
    { label: "Dieta", href: "#", action: "dieta", icon: "fas fa-utensils" },
    { label: "Catalogo", href: "/frontend/catalogo.html", icon: "fas fa-play-circle" },
    { label: "Progreso", href: "#", action: "progreso", icon: "fas fa-chart-line" },
    { label: "Comunidad", href: "/frontend/comunidad.html", icon: "fas fa-users", active: true },
    { label: "Logout", href: "#", action: "logout", icon: "fas fa-right-from-bracket" },
  ]);
}

async function fetchProfile(token) {
  const res = await fetch(`${API_BASE}/accounts/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearTokens();
    window.location.href = "/frontend/auth/login.html";
    return null;
  }
  if (!res.ok) throw new Error("No se pudo obtener el perfil");
  return res.json();
}

async function setupNavState() {
  const token = getAccessToken();
  if (!token) {
    showGuestNav();
    return;
  }

  try {
    const profile = await fetchProfile(token);
    if (!profile) return;
    const role = profile.role === "ALUMNO" ? "STUDENT" : profile.role;
    if (role === "ADMIN" || role === "ROOT") {
      window.location.href = "/frontend/coach/dashboard.html";
      return;
    }
    showStudentNav(profile);
  } catch (err) {
    console.error(err);
    showGuestNav();
  }
}

function bindMenuActions() {
  const navList = document.getElementById("navList");
  if (!navList) return;

  navList.addEventListener("click", (e) => {
    const target = e.target.closest("a");
    if (!target) return;
    const action = target.getAttribute("data-action");
    if (!action) return;
    e.preventDefault();
    closeMenu();

    if (action === "logout") {
      clearTokens();
      window.location.href = "/frontend/home.html";
      return;
    }
    if (action === "progreso") {
      gotoDashboard("progreso");
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

function setupEventListeners() {
  const locateBtn = document.getElementById("locateMe");
  const refreshBtn = document.getElementById("refreshMap");
  const searchInput = document.getElementById("gymSearch");

  if (locateBtn) locateBtn.addEventListener("click", locateUser);
  if (refreshBtn) refreshBtn.addEventListener("click", refreshMap);
  if (searchInput) searchInput.addEventListener("input", filterGyms);
}

function initializeMap() {
  map = L.map("gymMap").setView([31.865, -116.605], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 20,
  }).addTo(map);
}

function loadGymsData() {
  addGymsToMap();
  updateGymsList();
  updateGymCards();
}

function addGymsToMap() {
  gymsData.forEach((gym) => {
    const marker = L.marker([gym.lat, gym.lng], {
      icon: L.divIcon({
        className: "custom-marker",
        html: "🏋️",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    }).addTo(map);

    marker.bindPopup(`
      <div class="popup-content" style="color: #fff; font-family: Outfit, sans-serif;">
        <h3 style="color: #34d3ff; margin: 0 0 10px 0;">${gym.name}</h3>
        <p style="margin: 5px 0;"><strong>📍</strong> ${gym.address}</p>
        <p style="margin: 5px 0;"><strong>📞</strong> ${gym.phone}</p>
        <p style="margin: 5px 0;"><strong>⏰</strong> ${gym.hours}</p>
        <p style="margin: 5px 0;"><strong>⭐</strong> ${gym.rating}/5</p>
        <div style="margin-top: 10px;">
          <strong>🏋️ Servicios:</strong><br>
          ${gym.services.join(", ")}
        </div>
      </div>
    `);

    markers.push({ marker, gym });

    marker.on("click", () => {
      highlightGymInList(gym.id);
      showGymDetails(gym.id);
    });
  });

  const group = new L.featureGroup(markers.map((m) => m.marker));
  map.fitBounds(group.getBounds().pad(0.1));
}

function updateGymsList() {
  const gymList = document.getElementById("gymList");
  if (!gymList) return;

  gymList.innerHTML = gymsData
    .map(
      (gym) => `
      <div class="gym-item" data-gym-id="${gym.id}" onclick="showGymDetails(${gym.id})">
        <div class="gym-item-header">
          <div class="gym-name">${gym.name}</div>
          <div class="gym-distance" id="distance-${gym.id}">-- km</div>
        </div>
        <div class="gym-address">${gym.address}</div>
        <div class="gym-hours ${gym.isOpen ? "open" : "closed"}">
          <i class="fas fa-clock"></i>
          ${gym.isOpen ? "Abierto 24/7" : "Cerrado"}
        </div>
      </div>
    `
    )
    .join("");
}

function updateGymCards() {
  const gymCards = document.getElementById("gymCards");
  if (!gymCards) return;

  gymCards.innerHTML = gymsData
    .map(
      (gym) => `
      <div class="gym-card">
        <div class="gym-card-header">
          <div>
            <h3 class="gym-card-title">${gym.name}</h3>
            <p class="gym-address">${gym.address}</p>
          </div>
          <div class="gym-card-rating">
            <i class="fas fa-star"></i>
            ${gym.rating}
          </div>
        </div>
        <div class="gym-card-info">
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${gym.phone}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-clock"></i>
            <span>${gym.hours}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-info-circle"></i>
            <span>${gym.description}</span>
          </div>
        </div>
        <div class="gym-services">
          ${gym.services.map((service) => `<span class="service-tag">${service}</span>`).join("")}
        </div>
      </div>
    `
    )
    .join("");
}

function locateUser() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        L.marker([userLocation.lat, userLocation.lng], {
          icon: L.divIcon({
            className: "custom-marker user-location",
            html: "📍",
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
        })
          .addTo(map)
          .bindPopup("Tu ubicación actual")
          .openPopup();

        calculateDistances();
        showNotification("Ubicación detectada correctamente", "success");
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        showNotification("No se pudo obtener tu ubicación", "error");
        userLocation = { lat: 31.865, lng: -116.605 };
        calculateDistances();
      }
    );
  } else {
    showNotification("La geolocalización no es soportada por tu navegador", "error");
    userLocation = { lat: 31.865, lng: -116.605 };
    calculateDistances();
  }
}

function calculateDistances() {
  if (!userLocation) return;

  let nearestGym = null;
  let shortestDistance = Infinity;

  gymsData.forEach((gym) => {
    const distance = calculateDistance(userLocation.lat, userLocation.lng, gym.lat, gym.lng);

    const distanceElement = document.getElementById(`distance-${gym.id}`);
    if (distanceElement) {
      distanceElement.textContent = `${distance.toFixed(1)} km`;
    }

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestGym = gym;
    }
  });

  if (nearestGym) {
    currentNearestGym = nearestGym;
    const nearestGymEl = document.getElementById("nearestGym");
    const distanceEl = document.getElementById("distance");
    if (nearestGymEl) nearestGymEl.textContent = nearestGym.name;
    if (distanceEl) distanceEl.textContent = `${shortestDistance.toFixed(1)} km`;
    highlightNearestGym(nearestGym.id);
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function highlightNearestGym(gymId) {
  markers.forEach((m) => {
    m.marker._icon.className = m.marker._icon.className.replace(" nearest", "");
  });

  const nearestMarker = markers.find((m) => m.gym.id === gymId);
  if (nearestMarker && nearestMarker.marker._icon) {
    nearestMarker.marker._icon.className += " nearest";
  }
}

function showGymDetails(gymId) {
  const gym = gymsData.find((g) => g.id === gymId);
  if (!gym) return;

  highlightGymInList(gymId);
  map.setView([gym.lat, gym.lng], 15);

  const marker = markers.find((m) => m.gym.id === gymId);
  if (marker) {
    marker.marker.openPopup();
  }
}

function highlightGymInList(gymId) {
  document.querySelectorAll(".gym-item").forEach((item) => {
    item.classList.remove("active");
  });

  const gymItem = document.querySelector(`.gym-item[data-gym-id="${gymId}"]`);
  if (gymItem) {
    gymItem.classList.add("active");
  }
}

function filterGyms() {
  const searchTerm = document.getElementById("gymSearch").value.toLowerCase();
  const gymItems = document.querySelectorAll(".gym-item");

  gymItems.forEach((item) => {
    const name = item.querySelector(".gym-name").textContent.toLowerCase();
    const address = item.querySelector(".gym-address").textContent.toLowerCase();
    if (name.includes(searchTerm) || address.includes(searchTerm)) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

function refreshMap() {
  if (map) {
    map.invalidateSize();
    showNotification("Mapa actualizado", "success");
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${type === "success" ? "#4CAF50" : type === "error" ? "#F44336" : "#34d3ff"};
    color: ${type === "success" || type === "error" ? "#fff" : "#0b0f14"};
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 3000;
    max-width: 300px;
    animation: slideIn 0.3s ease;
    border-left: 4px solid ${type === "success" ? "#388E3C" : type === "error" ? "#D32F2F" : "#0fa3d5"};
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }
  }, 4000);

  const closeBtn = notification.querySelector(".notification-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => notification.remove());
  }
}

if (!document.querySelector("#notification-styles")) {
  const style = document.createElement("style");
  style.id = "notification-styles";
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

console.log("comunidad.js cargado");
