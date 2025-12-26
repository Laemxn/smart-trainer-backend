// Uses config exposed as global for classic scripts.
(async () => {
  const API = window.API_BASE_URL || "https://smart-trainer-backend-cs9r.onrender.com";

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
        username: (form.username.value || "").trim(),
        password: (form.password.value || "").trim(),
        age: Number(form.age.value),
        height_cm: Number(form.height_cm.value),
        weight_kg: Number(form.weight_kg.value),
        objective: (form.objective.value || "").trim(),
        level: (form.level.value || "").trim(),
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
