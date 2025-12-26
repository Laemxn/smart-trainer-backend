// Dynamic import to avoid module script requirement in HTML.
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

  async function createStudent(data) {
    const token = getAccess();
    if (!token) {
      alert("No autenticado");
      return;
    }

    const res = await fetch(`${API}/api/students/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  }

  const formEl = document.getElementById("createStudentForm");
  if (formEl) {
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();

      const form = e.target;

      const data = {
        username: form.username.value,
        password: form.password.value,
        age: Number(form.age.value),
        height_cm: Number(form.height_cm.value),
        weight_kg: Number(form.weight_kg.value),
        objective: form.objective.value,
        level: form.level.value,
      };

      const result = document.getElementById("result");
      if (result) result.textContent = "Creando alumno...";

      try {
        await createStudent(data);
        if (result) result.textContent = "ƒo. Alumno creado correctamente";
        form.reset();
      } catch (err) {
        if (result) result.textContent = "ƒ?O Error: " + err.message;
      }
    });
  }
})();
