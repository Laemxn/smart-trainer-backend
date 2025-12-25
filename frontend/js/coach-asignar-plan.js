import { API_BASE_URL } from "./config.js";

const API = API_BASE_URL;
const DAY_NAMES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

let catalogExercises = [];
let workoutPlan = [];

function getAccess() {
  return localStorage.getItem("access");
}

function redirectToLogin() {
  window.location.href = "/auth/login.html";
}

function getStudentId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function apiRequest(path, options = {}) {
  const token = getAccess();
  if (!token) {
    redirectToLogin();
    throw new Error("Sin token");
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    redirectToLogin();
    throw new Error("Token invalido o expirado");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error en la peticion");
  }

  return res.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWeekStatus(weekId) {
  return apiRequest(`/api/plans/status/?week_id=${weekId}`, { method: "GET" });
}

function formatWeekLabel(week) {
  const start = week.start_date || "sin inicio";
  const end = week.end_date || "sin fin";
  return `ID ${week.id} (${start} - ${end})`;
}

function findExercise(id) {
  const numericId = Number(id);
  if (!numericId) return null;
  return catalogExercises.find((item) => item.id === numericId) || null;
}

function formatExerciseOption(exercise) {
  const levelMap = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermedio",
    ADVANCED: "Avanzado",
  };
  const level = levelMap[exercise.level] || exercise.level || "";
  const muscle = exercise.muscle_group || "General";
  return `${exercise.title} (${muscle} | ${level})`;
}

function normalizePlanFromApi(plan = []) {
  return plan
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((day, idx) => ({
      day: day.name || day.day || `Dia ${idx + 1}`,
      exercises: (day.exercises || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((ex) => ({
          exercise_id: ex.exercise_id || (ex.exercise && ex.exercise.id) || "",
          sets: ex.sets ?? "",
          reps: ex.reps ?? "",
          notes: ex.notes ?? "",
        }))
        .filter((ex) => ex.exercise_id),
    }))
    .filter((day) => day.exercises && day.exercises.length);
}

function loadPlanFromApi(plan = []) {
  workoutPlan = normalizePlanFromApi(plan);
  renderPlanEditor();
}

function nextDayName() {
  const used = workoutPlan.map((day) => (day.day || "").toLowerCase());
  const candidate = DAY_NAMES.find((name) => !used.includes(name.toLowerCase()));
  return candidate || `Dia ${workoutPlan.length + 1}`;
}

function updateDayName(dayIndex, value) {
  if (!workoutPlan[dayIndex]) return;
  workoutPlan[dayIndex].day = value;
}

function updateExerciseField(dayIndex, exerciseIndex, key, value) {
  const day = workoutPlan[dayIndex];
  if (!day || !day.exercises[exerciseIndex]) return;
  day.exercises[exerciseIndex][key] = value;
}

function addDay() {
  workoutPlan.push({ day: nextDayName(), exercises: [] });
  renderPlanEditor();
}

function removeDay(dayIndex) {
  workoutPlan.splice(dayIndex, 1);
  renderPlanEditor();
}

function addExercise(dayIndex) {
  const defaultExercise = catalogExercises[0];
  workoutPlan[dayIndex].exercises.push({
    exercise_id: defaultExercise ? defaultExercise.id : "",
    sets: "",
    reps: "",
    notes: "",
  });
  renderPlanEditor();
}

function removeExercise(dayIndex, exerciseIndex) {
  const day = workoutPlan[dayIndex];
  if (!day) return;
  day.exercises.splice(exerciseIndex, 1);
  renderPlanEditor();
}

function collectMusclesForDay(day) {
  const labels = [];
  (day.exercises || []).forEach((ex) => {
    const meta = findExercise(ex.exercise_id);
    const muscle = meta?.muscle_group || "";
    if (muscle) {
      labels.push(muscle.toLowerCase());
    }
  });
  // Deduplicate while preserving order
  return [...new Set(labels)].map((m) => (m.charAt(0).toUpperCase() + m.slice(1)));
}

function renderPlanEditor() {
  const container = document.getElementById("workoutPlanContainer");
  if (!container) return;

  container.innerHTML = "";

  if (!workoutPlan.length) {
    container.innerHTML = `
      <div class="plan-empty">
        Genera la rutina con IA o agrega un dia para empezar.
      </div>
    `;
    return;
  }

  workoutPlan.forEach((day, dayIndex) => {
    const dayCard = document.createElement("div");
    dayCard.className = "plan-day";

    const header = document.createElement("div");
    header.className = "plan-day-header";

    const dayInput = document.createElement("input");
    dayInput.className = "day-name";
    dayInput.value = day.day || `Dia ${dayIndex + 1}`;
    dayInput.addEventListener("input", (e) => updateDayName(dayIndex, e.target.value));

    const muscles = collectMusclesForDay(day);
    const badge = document.createElement("span");
    badge.className = "day-muscles";
    badge.textContent = muscles.length ? muscles.join(", ") : "Sin grupo";

    const removeDayBtn = document.createElement("button");
    removeDayBtn.type = "button";
    removeDayBtn.className = "ghost-btn";
    removeDayBtn.textContent = "Quitar dia";
    removeDayBtn.addEventListener("click", () => removeDay(dayIndex));

    header.appendChild(dayInput);
    header.appendChild(badge);
    header.appendChild(removeDayBtn);
    dayCard.appendChild(header);

    const exerciseList = document.createElement("div");
    exerciseList.className = "exercise-list";

    day.exercises.forEach((exercise, exIndex) => {
      const row = document.createElement("div");
      row.className = "exercise-row";

      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecciona un ejercicio";
      select.appendChild(placeholder);

      catalogExercises.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = formatExerciseOption(item);
        select.appendChild(opt);
      });

      select.value = exercise.exercise_id || "";
      select.addEventListener("change", (e) =>
        updateExerciseField(dayIndex, exIndex, "exercise_id", Number(e.target.value))
      );

      const setsInput = document.createElement("input");
      setsInput.type = "number";
      setsInput.placeholder = "Series";
      setsInput.value = exercise.sets ?? "";
      setsInput.addEventListener("input", (e) =>
        updateExerciseField(dayIndex, exIndex, "sets", e.target.value)
      );

      const repsInput = document.createElement("input");
      repsInput.type = "text";
      repsInput.placeholder = "Reps o rango";
      repsInput.value = exercise.reps ?? "";
      repsInput.addEventListener("input", (e) =>
        updateExerciseField(dayIndex, exIndex, "reps", e.target.value)
      );

      const notesInput = document.createElement("input");
      notesInput.type = "text";
      notesInput.placeholder = "Notas/rest";
      notesInput.value = exercise.notes ?? "";
      notesInput.addEventListener("input", (e) =>
        updateExerciseField(dayIndex, exIndex, "notes", e.target.value)
      );

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "ghost-btn";
      removeBtn.textContent = "Quitar";
      removeBtn.addEventListener("click", () => removeExercise(dayIndex, exIndex));

      row.append(select, setsInput, repsInput, notesInput, removeBtn);
      exerciseList.appendChild(row);

      const meta = findExercise(exercise.exercise_id);
      if (meta) {
        const metaLine = document.createElement("div");
        metaLine.className = "exercise-meta";
        metaLine.textContent = `${meta.muscle_group || "General"} | ${meta.level}`;
        exerciseList.appendChild(metaLine);
      }
    });

    const addExerciseBtn = document.createElement("button");
    addExerciseBtn.type = "button";
    addExerciseBtn.className = "secondary-btn";
    addExerciseBtn.textContent = "Agregar ejercicio";
    addExerciseBtn.addEventListener("click", () => addExercise(dayIndex));

    exerciseList.appendChild(addExerciseBtn);
    dayCard.appendChild(exerciseList);
    container.appendChild(dayCard);
  });
}

function serializePlanForApi() {
  return workoutPlan
    .map((day) => {
      const exercises = (day.exercises || [])
        .map((ex) => {
          const parsedSets = parseInt(ex.sets, 10);
          return {
            exercise_id: Number(ex.exercise_id),
            sets: Number.isNaN(parsedSets) ? null : parsedSets,
            reps: (ex.reps || "").trim(),
            notes: (ex.notes || "").trim(),
          };
        })
        .filter((ex) => ex.exercise_id);

      return {
        day: (day.day || "").trim() || "Dia",
        exercises,
      };
    })
    .filter((day) => day.exercises.length);
}

async function loadCatalogExercises(statusEl) {
  try {
    const token = getAccess();
    const res = await fetch(`${API}/api/catalog/videos/`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error("No se pudo cargar el catalogo");
    catalogExercises = await res.json();
    renderPlanEditor();
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "No se pudo cargar el catalogo. Usa solo ejercicios existentes.";
  }
}

function fillDietContent(dietForm, content) {
  if (dietForm && content) {
    dietForm.content.value = content;
  }
}

async function loadWeekContent(weekId, workoutForm, dietForm) {
  if (!weekId) return null;
  const data = await fetchWeekStatus(weekId);
  if (Array.isArray(data.workout_plan)) {
    loadPlanFromApi(data.workout_plan);
  } else {
    loadPlanFromApi([]);
  }
  fillDietContent(dietForm, data.diet_content);
  return data;
}

async function pollWeekContent(weekId, type, statusEl, workoutForm, dietForm) {
  const maxAttempts = 40;
  const delayMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let data;
    try {
      data = await fetchWeekStatus(weekId);
    } catch (err) {
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
      return;
    }

    if (type === "workout") {
      if (data.workout_status === "ready") {
        if (Array.isArray(data.workout_plan)) loadPlanFromApi(data.workout_plan);
        if (statusEl) statusEl.textContent = "Rutina lista.";
        return;
      }
      if (data.workout_status === "error") {
        if (statusEl) statusEl.textContent = "No se pudo generar la rutina.";
        return;
      }
    } else {
      if (data.diet_status === "ready") {
        fillDietContent(dietForm, data.diet_content);
        if (statusEl) statusEl.textContent = "Dieta lista.";
        return;
      }
      if (data.diet_status === "error") {
        if (statusEl) statusEl.textContent = "No se pudo generar la dieta.";
        return;
      }
    }

    await delay(delayMs);
  }

  if (statusEl) statusEl.textContent = "Sigue en proceso. Puedes dejar la pagina abierta y se actualizara.";
}

async function loadActiveWeek(student, weekResult, workoutWeekId, dietWeekId) {
  try {
    const weeks = await apiRequest("/api/plans/status/", { method: "GET" });
    if (!Array.isArray(weeks)) return;

    const activeWeek = weeks.find(
      (week) => week.is_active && week.student === student.username
    );
    if (!activeWeek) return;

    if (weekResult) {
      weekResult.textContent = `Semana activa: ${formatWeekLabel(activeWeek)}`;
    }
    if (workoutWeekId) workoutWeekId.value = activeWeek.id;
    if (dietWeekId) dietWeekId.value = activeWeek.id;
    return activeWeek;
  } catch (err) {
    // Silently ignore if the status endpoint is unavailable for this role.
  }
  return null;
}

async function init() {
  const id = getStudentId();
  const statusEl = document.getElementById("status");
  const nameEl = document.getElementById("studentName");
  const weekForm = document.getElementById("weekForm");
  const workoutForm = document.getElementById("workoutForm");
  const dietForm = document.getElementById("dietForm");
  const weekResult = document.getElementById("weekResult");
  const workoutResult = document.getElementById("workoutResult");
  const dietResult = document.getElementById("dietResult");
  const workoutAiBtn = document.getElementById("workoutAiBtn");
  const aiFocus = document.getElementById("aiFocus");
  const aiDays = document.getElementById("aiDays");
  const aiNotes = document.getElementById("aiNotes");
  const dietAiBtn = document.getElementById("dietAiBtn");
  const workoutAiStatus = document.getElementById("workoutAiStatus");
  const dietAiStatus = document.getElementById("dietAiStatus");
  const workoutWeekId = document.getElementById("workout_week_id");
  const dietWeekId = document.getElementById("diet_week_id");
  const addDayBtn = document.getElementById("addDayBtn");
  const dietNotes = document.getElementById("dietNotes");
  const dietCalories = document.getElementById("dietCalories");

  if (!statusEl || !weekForm || !workoutForm || !dietForm) return;

  await loadCatalogExercises(workoutAiStatus);

  if (!id) {
    weekForm.style.display = "none";
    workoutForm.style.display = "none";
    dietForm.style.display = "none";
    if (workoutAiBtn) workoutAiBtn.style.display = "none";
    if (dietAiBtn) dietAiBtn.style.display = "none";
    return;
  }

  statusEl.textContent = "Cargando alumno...";
  try {
    const student = await apiRequest(`/api/students/${id}/`, { method: "GET" });
    if (nameEl) {
      nameEl.textContent = `Alumno: ${student.username} (ID ${student.id})`;
    }
    statusEl.textContent = "";
    const activeWeek = await loadActiveWeek(student, weekResult, workoutWeekId, dietWeekId);
    if (activeWeek) {
      await loadWeekContent(activeWeek.id, workoutForm, dietForm);
    } else {
      renderPlanEditor();
    }
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    weekForm.style.display = "none";
    workoutForm.style.display = "none";
    dietForm.style.display = "none";
    return;
  }

  if (addDayBtn) {
    addDayBtn.addEventListener("click", () => {
      addDay();
      if (workoutResult) workoutResult.textContent = "Edita la rutina y guarda para publicarla.";
    });
  }

  weekForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (weekResult) weekResult.textContent = "Creando semana...";

    const data = {
      student: Number(id),
      start_date: weekForm.start_date.value,
      end_date: weekForm.end_date.value,
    };

    try {
      const week = await apiRequest("/api/plans/weeks/", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (weekResult) {
        weekResult.textContent = `Semana creada: ${formatWeekLabel(week)}`;
      }
      if (workoutWeekId) workoutWeekId.value = week.id;
      if (dietWeekId) dietWeekId.value = week.id;
      loadPlanFromApi([]);
    } catch (err) {
      if (weekResult) weekResult.textContent = `Error: ${err.message}`;
    }
  });

  if (workoutAiBtn) {
    workoutAiBtn.addEventListener("click", async () => {
      const weekId = Number(workoutForm.week_id.value);
      if (!weekId) {
        if (workoutAiStatus) {
          workoutAiStatus.textContent = "Define el Week ID primero.";
        }
        return;
      }

      if (!catalogExercises.length) {
        await loadCatalogExercises(workoutAiStatus);
      }

      if (workoutAiStatus) {
        workoutAiStatus.textContent = "Generando rutina con IA...";
      }

      try {
        const payload = { week_id: weekId };
        if (aiFocus?.value) payload.focus_muscle = aiFocus.value;
        if (aiDays?.value) payload.days_per_week = Number(aiDays.value);
        if (aiNotes?.value) payload.ai_notes = aiNotes.value.trim();

        const response = await apiRequest("/api/plans/workouts/ai/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (workoutAiStatus) {
          workoutAiStatus.textContent = `${response.message} (status: ${response.status})`;
        }
        await pollWeekContent(weekId, "workout", workoutAiStatus, workoutForm, dietForm);
        if (workoutResult) workoutResult.textContent = "Rutina generada. Ajusta y guarda si es necesario.";
      } catch (err) {
        if (workoutAiStatus) {
          workoutAiStatus.textContent = `Error: ${err.message}`;
        }
      }
    });
  }

  workoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (workoutResult) workoutResult.textContent = "Guardando rutina...";

    const payloadPlan = serializePlanForApi();
    if (!payloadPlan.length) {
      if (workoutResult) workoutResult.textContent = "Agrega ejercicios antes de guardar.";
      return;
    }

    const data = {
      week_id: Number(workoutForm.week_id.value),
      plan: payloadPlan,
    };

    try {
      await apiRequest("/api/plans/workouts/", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (workoutResult) workoutResult.textContent = "Rutina guardada.";
    } catch (err) {
      if (workoutResult) workoutResult.textContent = `Error: ${err.message}`;
    }
  });

  dietForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (dietResult) dietResult.textContent = "Guardando dieta...";

    const data = {
      week_id: Number(dietForm.week_id.value),
      content: dietForm.content.value,
    };

    try {
      await apiRequest("/api/plans/diets/", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (dietResult) dietResult.textContent = "Dieta guardada.";
      dietForm.content.value = "";
    } catch (err) {
      if (dietResult) dietResult.textContent = `Error: ${err.message}`;
    }
  });

  if (dietAiBtn) {
    dietAiBtn.addEventListener("click", async () => {
      const weekId = Number(dietForm.week_id.value);
      if (!weekId) {
        if (dietAiStatus) {
          dietAiStatus.textContent = "Define el Week ID primero.";
        }
        return;
      }

      if (dietAiStatus) {
        dietAiStatus.textContent = "Generando dieta con IA...";
      }

      try {
        const payload = { week_id: weekId };
        if (dietNotes?.value) payload.notes = dietNotes.value.trim();
        if (dietCalories?.value) payload.calories = Number(dietCalories.value);

        const response = await apiRequest("/api/plans/diets/ai/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (dietAiStatus) {
          dietAiStatus.textContent = `${response.message} (status: ${response.status})`;
        }
        await pollWeekContent(weekId, "diet", dietAiStatus, workoutForm, dietForm);
      } catch (err) {
        if (dietAiStatus) {
          dietAiStatus.textContent = `Error: ${err.message}`;
        }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
