// Dynamic import to avoid module script requirement.
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

  const API = await loadConfig();

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

  async function apiDelete(path) {
    const token = getAccess();
    if (!token) {
      redirectToLogin();
      throw new Error("Sin token");
    }

    const res = await fetch(`${API}${path}`, {
      method: "DELETE",
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
  }

  async function loadStudents() {
    const statusEl = document.getElementById("status");
    const listEl = document.getElementById("students");

    if (!statusEl || !listEl) return;

    statusEl.textContent = "Cargando alumnos...";
    listEl.innerHTML = "";

    try {
      const students = await apiGet("/api/students/");
      if (!students || students.length === 0) {
        statusEl.textContent = "No hay alumnos.";
        return;
      }

      statusEl.textContent = "";
      students.forEach((student) => {
        const li = document.createElement("li");
        li.className = "student-item";
        const name = student.username || `ID ${student.id}`;

        const meta = document.createElement("span");
        meta.className = "student-meta";
        meta.textContent = `${name} (ID ${student.id})`;

        const editLink = document.createElement("a");
        editLink.href = `./editar-alumno.html?id=${student.id}`;
        editLink.textContent = "Editar";
        editLink.className = "action-link";

        const planLink = document.createElement("a");
        planLink.href = `./asignar-plan.html?id=${student.id}`;
        planLink.textContent = "Asignar plan";
        planLink.className = "action-link";

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Eliminar";
        deleteBtn.className = "action-button";
        deleteBtn.addEventListener("click", async () => {
          const ok = confirm("Eliminar alumno?");
          if (!ok) return;
          try {
            await apiDelete(`/api/students/${student.id}/`);
            li.remove();
            if (!listEl.querySelector(".student-item")) {
              statusEl.textContent = "No hay alumnos.";
            }
          } catch (err) {
            alert(`Error: ${err.message}`);
          }
        });

        const actions = document.createElement("span");
        actions.appendChild(editLink);
        actions.appendChild(document.createTextNode(" | "));
        actions.appendChild(planLink);
        actions.appendChild(document.createTextNode(" | "));
        actions.appendChild(deleteBtn);

        li.appendChild(meta);
        li.appendChild(actions);
        listEl.appendChild(li);
      });
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  }

  document.addEventListener("DOMContentLoaded", loadStudents);
})();
