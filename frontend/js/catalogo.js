// Dynamic import keeps compatibility with classic script tags.
(async () => {
  async function loadConfig() {
    try {
      const mod = await import("./config.js");
      return mod.API_BASE_URL;
    } catch (err) {
      console.error("No se pudo cargar config.js", err);
      return "https://smart-trainer-backend-cs9r.onrender.com";
    }
  }

  const API_BASE_URL = await loadConfig();
  const API_BASE = `${API_BASE_URL}/api`;

  let catalogItems = [];
  let userRole = null;

  const gridEl = document.getElementById("videosGrid");
  const loadingEl = document.getElementById("videosLoading");
  const emptyEl = document.getElementById("emptyState");
  const searchInput = document.getElementById("filterSearch");
  const muscleSelect = document.getElementById("filterMuscle");
  const levelSelect = document.getElementById("filterLevel");
  const refreshBtn = document.getElementById("refreshBtn");
  const adminPanel = document.getElementById("adminPanel");
  const adminBadge = document.getElementById("adminBadge");
  const createForm = document.getElementById("createVideoForm");
  const formStatus = document.getElementById("formStatus");

  const modal = document.getElementById("videoModal");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const assignedSection = document.getElementById("assignedSection");
  const assignedGrid = document.getElementById("assignedGrid");
  const assignedEmpty = document.getElementById("assignedEmpty");
  let assignedExercises = [];
  const assignedSearch = document.getElementById("assignedSearch");

  document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    bindMenuActions();
    bindAssignedSearch();
    bindFilters();
    bindModal();
    bindAdminForm();
    bootstrapCatalog();
  });

  function initMenu() {
    const burger = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu");
    if (!burger || !navMenu) return;

    burger.addEventListener("click", () => {
      burger.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        burger.classList.remove("active");
        navMenu.classList.remove("active");
      });
    });
  }

  function closeMenu() {
    const navMenu = document.getElementById("navMenu");
    const burger = document.getElementById("menuToggle");
    if (navMenu) navMenu.classList.remove("active");
    if (burger) burger.classList.remove("active");
  }

  async function bootstrapCatalog() {
    await loadProfile();
    await loadAssignedExercises();
    await loadVideos();
  }

  function getAccessToken() {
    return localStorage.getItem("access") || localStorage.getItem("access_token");
  }

  function clearTokens() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("access_token");
  }

  function hideAdminPanel() {
    adminPanel?.classList.add("hidden");
    adminBadge?.classList.add("hidden");
  }

  function hideAssigned() {
    assignedExercises = [];
    if (assignedSection) {
      assignedSection.classList.remove("hidden");
    }
    if (assignedEmpty) assignedEmpty.classList.remove("hidden");
    if (assignedGrid) assignedGrid.innerHTML = "";
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
    window.location.href = "/alumno/dashboard.html";
  }

  function showGuestNav() {
    buildMenu([
      { label: "Inicio", href: "/home.html", icon: "fas fa-home" },
      { label: "Catalogo", href: "/catalogo.html", icon: "fas fa-play-circle", active: true },
      { label: "Comunidad", href: "/comunidad.html", icon: "fas fa-users" },
      { label: "Login", href: "/auth/login.html", icon: "fas fa-sign-in-alt" },
    ]);
  }

  function showStudentNav(profile) {
    buildMenu([
      { label: `Hola, ${profile?.user || "Alumno"}`, href: "#", action: "perfil", icon: "fas fa-user" },
      { label: "Entrenamiento", href: "#", action: "rutina", icon: "fas fa-dumbbell" },
      { label: "Dieta", href: "#", action: "dieta", icon: "fas fa-utensils" },
      { label: "Catalogo", href: "/catalogo.html", icon: "fas fa-play-circle", active: true },
      { label: "Progreso", href: "#", action: "progreso", icon: "fas fa-chart-line" },
      { label: "Comunidad", href: "/comunidad.html", icon: "fas fa-users" },
      { label: "Logout", href: "#", action: "logout", icon: "fas fa-right-from-bracket" },
    ]);
  }

  async function loadProfile() {
    const token = getAccessToken();
    if (!token) {
      hideAdminPanel();
      hideAssigned();
      showGuestNav();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/accounts/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearTokens();
        hideAdminPanel();
        hideAssigned();
        showGuestNav();
        return;
      }

      if (!res.ok) throw new Error("No se pudo obtener el perfil");

      const profile = await res.json();
      const normalizedRole = profile.role === "ALUMNO" ? "STUDENT" : profile.role;
      userRole = normalizedRole;

      if (normalizedRole === "ADMIN" || normalizedRole === "ROOT") {
        window.location.href = "/coach/dashboard.html";
        return;
      }

      showStudentNav(profile);

      if (normalizedRole === "ROOT") {
        adminPanel?.classList.remove("hidden");
        adminBadge?.classList.remove("hidden");
      } else {
        hideAdminPanel();
      }
    } catch (err) {
      console.error(err);
      hideAdminPanel();
      hideAssigned();
      showGuestNav();
    }
  }

  async function loadAssignedExercises() {
    if (userRole !== "STUDENT") {
      hideAssigned();
      return;
    }
    const token = getAccessToken();
    if (!token) {
      hideAssigned();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/plans/workouts/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        assignedExercises = [];
        renderAssigned();
        return;
      }
      if (!res.ok) throw new Error("No se pudo cargar la rutina asignada");
      const workout = await res.json();
      const plan = Array.isArray(workout.plan) ? workout.plan : [];
      const map = new Map();
      plan.forEach((day) => {
        (day.exercises || []).forEach((ex) => {
          const info = ex.exercise;
          if (info && info.id && !map.has(info.id)) {
            map.set(info.id, {
              id: info.id,
              title: info.title,
              muscle_group: info.muscle_group,
              level: info.level,
              video_url: info.video_url,
              equipment: info.equipment,
              sets: ex.sets,
              reps: ex.reps,
              notes: ex.notes,
            });
          }
        });
      });
      assignedExercises = Array.from(map.values());
      renderAssigned();
    } catch (err) {
      console.error(err);
      assignedExercises = [];
      renderAssigned();
    }
  }

  function bindAssignedSearch() {
    if (!assignedSearch) return;
    let debounceId;
    assignedSearch.addEventListener("input", () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => renderAssigned(), 200);
    });
  }

  function bindFilters() {
    let debounceId;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceId);
        debounceId = setTimeout(loadVideos, 250);
      });
    }
    [muscleSelect, levelSelect].forEach((el) => {
      if (el) el.addEventListener("change", loadVideos);
    });
    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadVideos);
    }
  }

  function bindModal() {
    if (modalClose) modalClose.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.classList.contains("modal-backdrop")) {
          closeModal();
        }
      });
    }
  }

  function bindAdminForm() {
    if (!createForm) return;
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (userRole !== "ROOT") {
        setFormStatus("Solo ROOT puede crear videos.", true);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setFormStatus("Necesitas iniciar sesiИn como ROOT.", true);
        return;
      }

      const formData = new FormData(createForm);
      const payload = {
        title: formData.get("title") || "",
        video_url: formData.get("video_url") || "",
        muscle_group: formData.get("muscle_group") || "",
        level: formData.get("level") || "BEGINNER",
        description: formData.get("description") || "",
        equipment: formData.get("equipment") || "",
        is_public: formData.get("is_public") === "on",
      };

      const durationValue = formData.get("duration_seconds");
      if (durationValue) {
        const parsed = parseInt(durationValue, 10);
        if (!Number.isNaN(parsed)) {
          payload.duration_seconds = parsed;
        }
      }

      try {
        const res = await fetch(`${API_BASE}/catalog/videos/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "No se pudo crear el video");
        }

        setFormStatus("Video creado correctamente.", false);
        createForm.reset();
        await loadVideos();
      } catch (err) {
        console.error(err);
        setFormStatus("Error al crear el video. Revisa los datos.", true);
      }
    });
  }

  function setFormStatus(message, isError = false) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.style.color = isError ? "#fca5a5" : "#7ee0a5";
  }

  async function loadVideos() {
    toggleLoading(true);
    const params = new URLSearchParams();
    const search = searchInput?.value?.trim();
    if (search) params.append("q", search);
    if (muscleSelect?.value) params.append("muscle_group", muscleSelect.value);
    if (levelSelect?.value) params.append("level", levelSelect.value);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/catalog/videos/${params.toString() ? `?${params.toString()}` : ""}`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      if (!res.ok) throw new Error("No se pudo obtener el catケlogo");
      catalogItems = await res.json();
      renderCatalog(catalogItems);
    } catch (err) {
      console.error(err);
      showToast("No se pudo cargar el catケlogo", "error");
    } finally {
      toggleLoading(false);
    }
  }

  function renderCatalog(items) {
    if (!gridEl) return;
    gridEl.innerHTML = "";

    if (!items.length) {
      emptyEl?.classList.remove("hidden");
      updateStats([]);
      return;
    }

    emptyEl?.classList.add("hidden");
    updateStats(items);

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "video-card";

      if (userRole === "ROOT") {
        const adminChip = document.createElement("span");
        adminChip.className = "admin-chip";
        adminChip.textContent = item.is_public ? "Pカblico" : "Oculto";
        card.appendChild(adminChip);
      }

      const top = document.createElement("div");
      top.className = "card-top";
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = formatLevel(item.level);
      const status = document.createElement("span");
      status.className = `badge ${item.is_public ? "" : "badge-muted"}`;
      status.textContent = item.is_public ? "Publicado" : "Oculto";
      top.append(badge, status);

      const title = document.createElement("h3");
      title.textContent = item.title;

      const desc = document.createElement("p");
      desc.textContent = item.description || "Sin descripciИn.";

      const meta = document.createElement("div");
      meta.className = "video-meta";
      meta.innerHTML = `
        <span><i class="fas fa-dumbbell"></i> ${item.muscle_group || "Full body"}</span>
        <span><i class="fas fa-clock"></i> ${formatDuration(item.duration_seconds)}</span>
        <span><i class="fas fa-signal"></i> ${formatLevel(item.level)}</span>
        ${item.equipment ? `<span><i class="fas fa-toolbox"></i> ${item.equipment}</span>` : ""}
      `;

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const watchBtn = document.createElement("button");
      watchBtn.className = "watch-btn";
      watchBtn.innerHTML = `<i class="fas fa-play"></i> Ver video`;
      watchBtn.addEventListener("click", () => openVideo(item));
      actions.appendChild(watchBtn);

      if (userRole === "ROOT") {
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "secondary-btn";
        toggleBtn.textContent = item.is_public ? "Ocultar" : "Publicar";
        toggleBtn.addEventListener("click", () => toggleVisibility(item));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "secondary-btn danger";
        deleteBtn.textContent = "Eliminar";
        deleteBtn.addEventListener("click", () => deleteVideo(item));

        actions.append(toggleBtn, deleteBtn);
      }

      card.append(top, title, desc, meta, actions);
      gridEl.appendChild(card);
    });
  }

  function renderAssigned() {
    if (!assignedSection || !assignedGrid) return;
    const term = assignedSearch?.value?.toLowerCase().trim();
    const items = term
      ? assignedExercises.filter(
          (it) =>
            it.title.toLowerCase().includes(term) ||
            (it.muscle_group || "").toLowerCase().includes(term) ||
            (it.reps || "").toLowerCase().includes(term)
        )
      : assignedExercises;

    if (!items.length) {
      assignedSection.classList.remove("hidden");
      assignedEmpty?.classList.remove("hidden");
      assignedGrid.innerHTML = "";
      return;
    }

    assignedSection.classList.remove("hidden");
    assignedEmpty?.classList.add("hidden");
    assignedGrid.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "video-card";

      const top = document.createElement("div");
      top.className = "card-top";
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = item.muscle_group || "General";
      const status = document.createElement("span");
      status.className = "badge";
      status.textContent = item.level ? formatLevel(item.level) : "Asignado";
      top.append(badge, status);

      const title = document.createElement("h3");
      title.textContent = item.title;

      const desc = document.createElement("p");
      const details = [item.reps ? `${item.reps}` : "", item.sets ? `${item.sets} sets` : ""]
        .filter(Boolean)
        .join(" 嫉 ");
      desc.textContent = details || "Ejercicio asignado en tu rutina.";

      const meta = document.createElement("div");
      meta.className = "video-meta";
      meta.innerHTML = `
        <span><i class="fas fa-dumbbell"></i> ${item.muscle_group || "General"}</span>
        ${item.equipment ? `<span><i class="fas fa-toolbox"></i> ${item.equipment}</span>` : ""}
      `;

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const watchBtn = document.createElement("button");
      watchBtn.className = "watch-btn";
      watchBtn.innerHTML = `<i class="fas fa-play"></i> Ver video`;
      watchBtn.addEventListener("click", () => openVideo({ title: item.title, video_url: item.video_url }));
      actions.appendChild(watchBtn);

      card.append(top, title, desc, meta, actions);
      assignedGrid.appendChild(card);
    });
  }

  function formatLevel(level) {
    const map = {
      BEGINNER: "Beginner",
      INTERMEDIATE: "Intermediate",
      ADVANCED: "Advanced",
    };
    return map[level] || "Sin nivel";
  }

  function formatDuration(seconds) {
    if (!seconds) return "Flexible";
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours}h ${remaining}m`;
  }

  function toggleLoading(show) {
    if (loadingEl) loadingEl.classList.toggle("hidden", !show);
  }

  function openVideo(item) {
    if (!modal || !modalBody) return;
    const embedUrl = buildEmbedUrl(item.video_url);

    if (embedUrl) {
      modalBody.innerHTML = `
        <iframe src="${embedUrl}" title="${item.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      `;
    } else {
      modalBody.innerHTML = `
        <div style="padding: 1rem; color: #c7d3e4;">
          <p>Este video se abre en una nueva pestaヵa:</p>
          <a href="${item.video_url}" target="_blank" rel="noopener" style="color: #34d3ff; font-weight: 700;">${item.video_url}</a>
        </div>
      `;
    }

    modal.classList.remove("hidden");
  }

  function closeModal() {
    if (!modal || !modalBody) return;
    modal.classList.add("hidden");
    modalBody.innerHTML = "";
  }

  function buildEmbedUrl(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      if (host.includes("youtube.com")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (host === "youtu.be") {
        const id = parsed.pathname.replace("/", "");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (host.includes("vimeo.com")) {
        const id = parsed.pathname.split("/").filter(Boolean).pop();
        return id ? `https://player.vimeo.com/video/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function toggleVisibility(item) {
    if (userRole !== "ROOT") return;
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/catalog/videos/${item.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_public: !item.is_public }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estado");
      showToast(item.is_public ? "Video ocultado" : "Video publicado", "info");
      await loadVideos();
    } catch (err) {
      console.error(err);
      showToast("No se pudo actualizar el video", "error");
    }
  }

  async function deleteVideo(item) {
    if (userRole !== "ROOT") return;
    const token = getAccessToken();
    if (!token) return;

    if (!confirm("隅Eliminar este video del catケlogo?")) return;

    try {
      const res = await fetch(`${API_BASE}/catalog/videos/${item.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("No se pudo eliminar el video");
      showToast("Video eliminado", "info");
      await loadVideos();
    } catch (err) {
      console.error(err);
      showToast("No se pudo eliminar el video", "error");
    }
  }

  function updateStats(items) {
    const total = items.length;
    const beginner = items.filter((i) => i.level === "BEGINNER").length;
    const intermediate = items.filter((i) => i.level === "INTERMEDIATE").length;
    const advanced = items.filter((i) => i.level === "ADVANCED").length;

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    set("statTotal", total);
    set("statBeginner", beginner);
    set("statIntermediate", intermediate);
    set("statAdvanced", advanced);
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.top = "90px";
    toast.style.right = "20px";
    toast.style.padding = "0.85rem 1rem";
    toast.style.borderRadius = "12px";
    toast.style.fontWeight = "700";
    toast.style.zIndex = "3000";
    toast.style.color = type === "error" ? "#ffd4d4" : "#0b0f14";
    toast.style.background =
      type === "error" ? "rgba(239,68,68,0.9)" : type === "info" ? "rgba(52,211,255,0.9)" : "rgba(74,222,128,0.9)";
    toast.style.boxShadow = "0 10px 24px rgba(0,0,0,0.35)";

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
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
      if (action === "progreso") {
        gotoDashboard("progreso");
        return;
      }
    });
  }
})();
