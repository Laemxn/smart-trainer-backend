const API = "http://127.0.0.1:8000";

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
      "Authorization": `Bearer ${token}`,
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

document
  .getElementById("createStudentForm")
  .addEventListener("submit", async (e) => {
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
    result.textContent = "Creando alumno...";

    try {
      await createStudent(data);
      result.textContent = "✅ Alumno creado correctamente";
      form.reset();
    } catch (err) {
      result.textContent = "❌ Error: " + err.message;
    }
  });
